/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { getErrorMessage } from '../utils/errors.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob, escape } from 'glob';
import type { ProcessedFileReadResult } from '../utils/fileUtils.js';
import {
  detectFileType,
  processSingleFileContent,
  getSpecificMimeType,
} from '../utils/fileUtils.js';
import type { PartListUnion } from '@google/genai';
import type { Config } from '../config/config.js';
import { DEFAULT_FILE_FILTERING_OPTIONS } from '../config/config.js';
import { FileOperation } from '../telemetry/metrics.js';
import { getProgrammingLanguage } from '../telemetry/telemetry-utils.js';
import { logFileOperation } from '../telemetry/loggers.js';
import { FileOperationEvent } from '../telemetry/types.js';
import { ToolErrorType } from './tool-error.js';

/**
 * Parameters for the ReadManyFilesTool.
 */
export interface ReadManyFilesParams {
  /**
   * An array of file paths or directory paths to search within.
   * Paths are relative to the tool's configured target directory.
   * Glob patterns can be used directly in these paths.
   */
  paths: string[];

  /**
   * Optional. Glob patterns for files to include.
   * These are effectively combined with the `paths`.
   * Example: ["*.ts", "src/** /*.md"]
   */
  include?: string[];

  /**
   * Optional. Glob patterns for files/directories to exclude.
   * Applied as ignore patterns.
   * Example: ["*.log", "dist/**"]
   */
  exclude?: string[];

  /**
   * Optional. Search directories recursively.
   * This is generally controlled by glob patterns (e.g., `**`).
   * The glob implementation is recursive by default for `**`.
   * For simplicity, we'll rely on `**` for recursion.
   */
  recursive?: boolean;

  /**
   * Optional. Apply default exclusion patterns. Defaults to true.
   */
  useDefaultExcludes?: boolean;

  /**
   * Whether to respect .gitignore and .geminiignore patterns (optional, defaults to true)
   */
  file_filtering_options?: {
    respect_git_ignore?: boolean;
    respect_gemini_ignore?: boolean;
  };

  /**
   * Optional. When true, the tool will avoid emitting user-facing status output.
   * Used when the caller wants to fetch file content silently for downstream tools.
   * Defaults to true.
   */
  suppress_ui_output?: boolean;
}

/**
 * Result type for file processing operations
 */
type FileProcessingResult =
  | {
      success: true;
      filePath: string;
      relativePathForDisplay: string;
      fileReadResult: ProcessedFileReadResult;
      reason?: undefined;
    }
  | {
      success: false;
      filePath: string;
      relativePathForDisplay: string;
      fileReadResult?: undefined;
      reason: string;
    };

/**
 * Creates the default exclusion patterns including dynamic patterns.
 * This combines the shared patterns with dynamic patterns like GEMINI.md.
 * TODO(adh): Consider making this configurable or extendable through a command line argument.
 */
function getDefaultExcludes(config?: Config): string[] {
  return config?.getFileExclusions().getReadManyFilesExcludes() ?? [];
}

const DEFAULT_OUTPUT_SEPARATOR_FORMAT = '--- {filePath} ---';
const DEFAULT_OUTPUT_TERMINATOR = '\n--- End of content ---';

class ReadManyFilesToolInvocation extends BaseToolInvocation<
  ReadManyFilesParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ReadManyFilesParams,
  ) {
    super(params);
  }

  getDescription(): string {
    const allPatterns = [...this.params.paths, ...(this.params.include || [])];
    const patternList = allPatterns.slice(0, 3).join(', ');
    const suffix = allPatterns.length > 3 ? ` +${allPatterns.length - 3} more` : '';
    return `Reading: ${patternList}${suffix}`;
  }

  async execute(signal: AbortSignal): Promise<ToolResult> {
    const {
      paths: inputPatterns,
      include = [],
      exclude = [],
      useDefaultExcludes = true,
    } = this.params;

    const defaultFileIgnores =
      this.config.getFileFilteringOptions() ?? DEFAULT_FILE_FILTERING_OPTIONS;

    const fileFilteringOptions = {
      respectGitIgnore:
        this.params.file_filtering_options?.respect_git_ignore ??
        defaultFileIgnores.respectGitIgnore, // Use the property from the returned object
      respectGeminiIgnore:
        this.params.file_filtering_options?.respect_gemini_ignore ??
        defaultFileIgnores.respectGeminiIgnore, // Use the property from the returned object
    };
    // Get centralized file discovery service
    const fileDiscovery = this.config.getFileService();

    const filesToConsider = new Set<string>();
    const skippedFiles: Array<{ path: string; reason: string }> = [];
    const processedFilesRelativePaths: string[] = [];
    const contentParts: PartListUnion = [];

    const effectiveExcludes = useDefaultExcludes
      ? [...getDefaultExcludes(this.config), ...exclude]
      : [...exclude];

    const searchPatterns = [...inputPatterns, ...include];
    try {
      const allEntries = new Set<string>();
      const workspaceDirs = this.config.getWorkspaceContext().getDirectories();

      for (const dir of workspaceDirs) {
        const processedPatterns = [];
        for (const p of searchPatterns) {
          const normalizedP = p.replace(/\\/g, '/');
          const fullPath = path.join(dir, normalizedP);
          if (fs.existsSync(fullPath)) {
            processedPatterns.push(escape(normalizedP));
          } else {
            // The path does not exist or is not a file, so we treat it as a glob pattern.
            processedPatterns.push(normalizedP);
          }
        }

        const entriesInDir = await glob(processedPatterns, {
          cwd: dir,
          ignore: effectiveExcludes,
          nodir: true,
          dot: true,
          absolute: true,
          nocase: true,
          signal,
        });
        for (const entry of entriesInDir) {
          allEntries.add(entry);
        }
      }
      const entries = Array.from(allEntries);

      const gitFilteredEntries = fileFilteringOptions.respectGitIgnore
        ? fileDiscovery
            .filterFiles(
              entries.map((p) => path.relative(this.config.getTargetDir(), p)),
              {
                respectGitIgnore: true,
                respectGeminiIgnore: false,
              },
            )
            .map((p) => path.resolve(this.config.getTargetDir(), p))
        : entries;

      // Apply gemini ignore filtering if enabled
      const finalFilteredEntries = fileFilteringOptions.respectGeminiIgnore
        ? fileDiscovery
            .filterFiles(
              gitFilteredEntries.map((p) =>
                path.relative(this.config.getTargetDir(), p),
              ),
              {
                respectGitIgnore: false,
                respectGeminiIgnore: true,
              },
            )
            .map((p) => path.resolve(this.config.getTargetDir(), p))
        : gitFilteredEntries;

      let gitIgnoredCount = 0;
      let geminiIgnoredCount = 0;

      for (const absoluteFilePath of entries) {
        // Security check: ensure the glob library didn't return something outside the workspace.
        if (
          !this.config
            .getWorkspaceContext()
            .isPathWithinWorkspace(absoluteFilePath)
        ) {
          skippedFiles.push({
            path: absoluteFilePath,
            reason: `Security: Glob library returned path outside workspace. Path: ${absoluteFilePath}`,
          });
          continue;
        }

        // Check if this file was filtered out by git ignore
        if (
          fileFilteringOptions.respectGitIgnore &&
          !gitFilteredEntries.includes(absoluteFilePath)
        ) {
          gitIgnoredCount++;
          continue;
        }

        // Check if this file was filtered out by gemini ignore
        if (
          fileFilteringOptions.respectGeminiIgnore &&
          !finalFilteredEntries.includes(absoluteFilePath)
        ) {
          geminiIgnoredCount++;
          continue;
        }

        filesToConsider.add(absoluteFilePath);
      }

      // Add info about git-ignored files if any were filtered
      if (gitIgnoredCount > 0) {
        skippedFiles.push({
          path: `${gitIgnoredCount} file(s)`,
          reason: 'git ignored',
        });
      }

      // Add info about gemini-ignored files if any were filtered
      if (geminiIgnoredCount > 0) {
        skippedFiles.push({
          path: `${geminiIgnoredCount} file(s)`,
          reason: 'gemini ignored',
        });
      }
    } catch (error) {
      const errorMessage = `Error during file search: ${getErrorMessage(error)}`;
      return {
        llmContent: errorMessage,
        returnDisplay: `## File Search Error\n\nAn error occurred while searching for files:\n\`\`\`\n${getErrorMessage(error)}\n\`\`\``,
        error: {
          message: errorMessage,
          type: ToolErrorType.READ_MANY_FILES_SEARCH_ERROR,
        },
      };
    }

    const sortedFiles = Array.from(filesToConsider).sort();

    const fileProcessingPromises = sortedFiles.map(
      async (filePath): Promise<FileProcessingResult> => {
        try {
          const relativePathForDisplay = path
            .relative(this.config.getTargetDir(), filePath)
            .replace(/\\/g, '/');

          const fileType = await detectFileType(filePath);

          if (fileType === 'image' || fileType === 'pdf') {
            const fileExtension = path.extname(filePath).toLowerCase();
            const fileNameWithoutExtension = path.basename(
              filePath,
              fileExtension,
            );
            const requestedExplicitly = inputPatterns.some(
              (pattern: string) =>
                pattern.toLowerCase().includes(fileExtension) ||
                pattern.includes(fileNameWithoutExtension),
            );

            if (!requestedExplicitly) {
              return {
                success: false,
                filePath,
                relativePathForDisplay,
                reason:
                  'asset file (image/pdf) was not explicitly requested by name or extension',
              };
            }
          }

          // Use processSingleFileContent for all file types now
          const fileReadResult = await processSingleFileContent(
            filePath,
            this.config.getTargetDir(),
            this.config.getFileSystemService(),
          );

          if (fileReadResult.error) {
            return {
              success: false,
              filePath,
              relativePathForDisplay,
              reason: `Read error: ${fileReadResult.error}`,
            };
          }

          return {
            success: true,
            filePath,
            relativePathForDisplay,
            fileReadResult,
          };
        } catch (error) {
          const relativePathForDisplay = path
            .relative(this.config.getTargetDir(), filePath)
            .replace(/\\/g, '/');

          return {
            success: false,
            filePath,
            relativePathForDisplay,
            reason: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    );

    const results = await Promise.allSettled(fileProcessingPromises);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const fileResult = result.value;

        if (!fileResult.success) {
          // Handle skipped files (images/PDFs not requested or read errors)
          skippedFiles.push({
            path: fileResult.relativePathForDisplay,
            reason: fileResult.reason,
          });
        } else {
          // Handle successfully processed files
          const { filePath, relativePathForDisplay, fileReadResult } =
            fileResult;

          if (typeof fileReadResult.llmContent === 'string') {
            const separator = DEFAULT_OUTPUT_SEPARATOR_FORMAT.replace(
              '{filePath}',
              filePath,
            );
            let fileContentForLlm = '';
            if (fileReadResult.isTruncated) {
              fileContentForLlm += `[WARNING: This file was truncated. To view the full content, use the 'read_file' tool on this specific file.]\n\n`;
            }
            fileContentForLlm += fileReadResult.llmContent;
            contentParts.push(`${separator}\n\n${fileContentForLlm}\n\n`);
          } else {
            // This is a Part for image/pdf, which we don't add the separator to.
            contentParts.push(fileReadResult.llmContent);
          }

          processedFilesRelativePaths.push(relativePathForDisplay);

          const lines =
            typeof fileReadResult.llmContent === 'string'
              ? fileReadResult.llmContent.split('\n').length
              : undefined;
          const mimetype = getSpecificMimeType(filePath);
          const programming_language = getProgrammingLanguage({
            absolute_path: filePath,
          });
          logFileOperation(
            this.config,
            new FileOperationEvent(
              ReadManyFilesTool.Name,
              FileOperation.READ,
              lines,
              mimetype,
              path.extname(filePath),
              undefined,
              programming_language,
            ),
          );
        }
      } else {
        // Handle Promise rejection (unexpected errors)
        skippedFiles.push({
          path: 'unknown',
          reason: `Unexpected error: ${result.reason}`,
        });
      }
    }

    let displayMessage = '';

    // Default to true for suppress_ui_output
    const suppressOutput = this.params.suppress_ui_output ?? true;

    if (!suppressOutput) {
      displayMessage = `### ReadManyFiles Result (Target Dir: \`${this.config.getTargetDir()}\`)\n\n`;
      if (processedFilesRelativePaths.length > 0) {
        displayMessage += `Successfully read and concatenated content from **${processedFilesRelativePaths.length} file(s)**.\n`;
        if (processedFilesRelativePaths.length <= 10) {
          displayMessage += `\n**Processed Files:**\n`;
          processedFilesRelativePaths.forEach(
            (p) => (displayMessage += `- \`${p}\`\n`),
          );
        } else {
          displayMessage += `\n**Processed Files (first 10 shown):**\n`;
          processedFilesRelativePaths
            .slice(0, 10)
            .forEach((p) => (displayMessage += `- \`${p}\`\n`));
          displayMessage += `- ...and ${processedFilesRelativePaths.length - 10} more.\n`;
        }
      }

      if (skippedFiles.length > 0) {
        if (processedFilesRelativePaths.length === 0) {
          displayMessage += `No files were read and concatenated based on the criteria.\n`;
        }
        if (skippedFiles.length <= 5) {
          displayMessage += `\n**Skipped ${skippedFiles.length} item(s):**\n`;
        } else {
          displayMessage += `\n**Skipped ${skippedFiles.length} item(s) (first 5 shown):**\n`;
        }
        skippedFiles
          .slice(0, 5)
          .forEach(
            (f) => (displayMessage += `- \`${f.path}\` (Reason: ${f.reason})\n`),
          );
        if (skippedFiles.length > 5) {
          displayMessage += `- ...and ${skippedFiles.length - 5} more.\n`;
        }
      } else if (
        processedFilesRelativePaths.length === 0 &&
        skippedFiles.length === 0
      ) {
        displayMessage += `No files were read and concatenated based on the criteria.\n`;
      }
    }

    if (contentParts.length > 0) {
      contentParts.push(DEFAULT_OUTPUT_TERMINATOR);
    } else {
      contentParts.push(
        'No files matching the criteria were found or all were skipped.',
      );
    }
    return {
      llmContent: contentParts,
      returnDisplay: displayMessage.trim(),
    };
  }
}

/**
 * Tool implementation for finding and reading multiple text files from the local filesystem
 * within a specified target directory. The content is concatenated.
 * It is intended to run in an environment with access to the local file system (e.g., a Node.js backend).
 */
export class ReadManyFilesTool extends BaseDeclarativeTool<
  ReadManyFilesParams,
  ToolResult
> {
  static readonly Name: string = 'read_many_files';

  constructor(private config: Config) {
    const parameterSchema = {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
          },
          minItems: 1,
          description:
            "Required. An array of glob patterns or paths relative to the tool's target directory. Examples: ['src/**/*.ts'], ['README.md', 'docs/']",
        },
        include: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
          },
          description:
            'Optional. Additional glob patterns to include. These are merged with `paths`. Example: "*.test.ts" to specifically add test files if they were broadly excluded.',
          default: [],
        },
        exclude: {
          type: 'array',
          items: {
            type: 'string',
            minLength: 1,
          },
          description:
            'Optional. Glob patterns for files/directories to exclude. Added to default excludes if useDefaultExcludes is true. Example: "**/*.log", "temp/"',
          default: [],
        },
        recursive: {
          type: 'boolean',
          description:
            'Optional. Whether to search recursively (primarily controlled by `**` in glob patterns). Defaults to true.',
          default: true,
        },
        useDefaultExcludes: {
          type: 'boolean',
          description:
            'Optional. Whether to apply a list of default exclusion patterns (e.g., node_modules, .git, binary files). Defaults to true.',
          default: true,
        },
        file_filtering_options: {
          description:
            'Whether to respect ignore patterns from .gitignore or .geminiignore',
          type: 'object',
          properties: {
            respect_git_ignore: {
              description:
                'Optional: Whether to respect .gitignore patterns when listing files. Only available in git repositories. Defaults to true.',
              type: 'boolean',
            },
            respect_gemini_ignore: {
              description:
                'Optional: Whether to respect .geminiignore patterns when listing files. Defaults to true.',
              type: 'boolean',
            },
          },
        },
        suppress_ui_output: {
          type: 'boolean',
          description:
            'Optional. When true, skip emitting verbose status output to the UI. Content is still returned for downstream use.',
          default: true,
        },
      },
      required: ['paths'],
    };

    super(
      ReadManyFilesTool.Name,
      'ReadManyFiles',
      `Reads content from multiple files specified by paths or glob patterns within a configured target directory. For text files, it concatenates their content into a single string. It is primarily designed for text-based files. However, it can also process image (e.g., .png, .jpg) and PDF (.pdf) files if their file names or extensions are explicitly included in the 'paths' argument. For these explicitly requested non-text files, their data is read and included in a format suitable for model consumption (e.g., base64 encoded).

This tool is useful when you need to understand or analyze a collection of files, such as:
- Getting an overview of a codebase or parts of it (e.g., all TypeScript files in the 'src' directory).
- Finding where specific functionality is implemented if the user asks broad questions about code.
- Reviewing documentation files (e.g., all Markdown files in the 'docs' directory).
- Gathering context from multiple configuration files.
- When the user asks to "read all files in X directory" or "show me the content of all Y files".

IMPORTANT: When using this tool to read files as input for another tool (like proof_helper), ALWAYS set suppress_ui_output: true to avoid verbose output in the UI.

Use this tool when the user's query implies needing the content of several files simultaneously for context, analysis, or summarization. For text files, it uses default UTF-8 encoding and a '--- {filePath} ---' separator between file contents. The tool inserts a '--- End of content ---' after the last file. Ensure paths are relative to the target directory. Glob patterns like 'src/**/*.js' are supported. Avoid using for single files if a more specific single-file reading tool is available, unless the user specifically requests to process a list containing just one file via this tool. Other binary files (not explicitly requested as image/PDF) are generally skipped. Default excludes apply to common non-text files (except for explicitly requested images/PDFs) and large dependency directories unless 'useDefaultExcludes' is false.`,
      Kind.Read,
      parameterSchema,
    );
  }

  protected createInvocation(
    params: ReadManyFilesParams,
  ): ToolInvocation<ReadManyFilesParams, ToolResult> {
    return new ReadManyFilesToolInvocation(this.config, params);
  }
}
