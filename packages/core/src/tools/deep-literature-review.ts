/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import OpenAI from 'openai';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import type { Config } from '../config/config.js';

export interface DeepLiteratureReviewParams {
  // High-level research query/topic. If omitted, `instructions` must be provided.
  query?: string;
  // Optional explicit instructions to pass to the deep research model.
  instructions?: string;
  // Optional model override (e.g., "openai:o3-deep-research" or "openai:o4-mini-deep-research").
  model?: string;
  // Whether to include the web search tool.
  include_web_search?: boolean;
  // Optional vector store IDs for file search.
  vector_store_ids?: string[];
  // Whether to enable the code interpreter tool.
  use_code_interpreter?: boolean;
  // Optional MCP server to connect for deep research (read-only, require_approval must be "never").
  mcp_server?: {
    server_label: string;
    server_url: string;
    // For deep-research MCP, only "never" is supported per docs, but allow validation here.
    require_approval?: 'never';
  };
  // Optional metadata for the response (helps correlate via webhooks/dashboard).
  metadata?: Record<string, string>;
}

class DeepLiteratureReviewInvocation extends BaseToolInvocation<
  DeepLiteratureReviewParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: DeepLiteratureReviewParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return 'Kick off a Deep Research background task via OpenAI Responses API.';
  }

  override async shouldConfirmExecute(): Promise<import('./tools.js').ToolCallConfirmationDetails | false> {
    return {
      type: 'info',
      title: 'Start Deep Literature Review (background)',
      onConfirm: async () => {
        // no-op: confirmation acknowledged
      },
      prompt:
        'This will start a long-running Deep Literature Research job (background mode). Progress and final output will be saved to .econ/deep-lit-runs/<timestamp>/.',
    };
  }

  private openaiClient: OpenAI | undefined;

  private ensureOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env['OPENAI_API_KEY']?.trim();
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required to use Deep Research models.');
      }
      const baseURL =
        process.env['OPENAI_BASE_URL']?.trim() ||
        process.env['DEEP_RESEARCH_OPENAI_BASE_URL']?.trim() ||
        undefined;
      // Use a longer timeout since deep-research requests can be slow even for kickoff
      this.openaiClient = new OpenAI({ apiKey, baseURL, timeout: 3600 * 1000 });
    }
    return this.openaiClient!;
  }

  private resolveModel(): string {
    // Priority: explicit param -> env -> default
    const fromParam = this.params.model?.trim();
    const fromEnv = process.env['DEEP_RESEARCH_MODEL']?.trim();
    const hasOpenAI = !!process.env['OPENAI_API_KEY']?.trim();

    let provider: 'openai' | 'gemini' = 'openai';
    let model: string | undefined;

    const parse = (val: string | undefined) => {
      if (!val) return undefined;
      if (val.toLowerCase().startsWith('openai:')) return val.slice('openai:'.length).trim();
      return val.trim();
    };

    model = parse(fromParam) || parse(fromEnv);

    if (!model) {
      if (hasOpenAI) {
        // Default to the specified newer model
        model = 'o4-mini-deep-research-2025-06-26';
      } else {
        provider = 'gemini';
      }
    }

    if (provider !== 'openai') {
      throw new Error('Deep literature review requires OpenAI deep research models. Set OPENAI_API_KEY and use openai:o3-deep-research or openai:o4-mini-deep-research.');
    }
    if (!model) {
      throw new Error('A deep research model is required (e.g., openai:o3-deep-research).');
    }
    return model;
  }

  private buildInstructions(query?: string, provided?: string): string {
    if (provided && provided.trim().length > 0) return provided.trim();
    const topic = (query || '').trim();
    return `You are an expert research analyst conducting a deep literature review.
Task: Produce a comprehensive, data-backed report on: ${topic || '(unspecified topic)'}

Requirements:
- Include specific figures, trends, statistics, and measurable outcomes.
- Prioritize reliable, up-to-date sources: peer-reviewed articles, reputable organizations (WHO, CDC, OECD, IMF), regulators, official filings.
- Provide inline citations with full source metadata for every claim and table.
- Clearly separate facts from interpretation; avoid generalities.
- Where helpful, synthesize into tables (methodology, cohorts, outcomes, publication dates).
- Identify conflicting findings and explain reasons for discrepancies.
- List limitations and open questions at the end.

Output format:
- Title
- Executive Summary (key findings, 5–8 bullets with citations)
- Methodology & Scope
- Evidence Review (grouped by theme, with inline citations)
- Analysis & Synthesis (comparative assessment, strengths/weaknesses)
- Tables (if applicable)
- Limitations & Further Work
- References (full metadata)
`;
  }

  async execute(signal: AbortSignal, updateOutput?: (out: string) => void): Promise<ToolResult> {
    try {
      const model = this.resolveModel();
      const client = this.ensureOpenAIClient();

      const includeWeb = this.params.include_web_search !== false; // default true
      const includeCI = this.params.use_code_interpreter !== false; // default true
      const vectorStores = (this.params.vector_store_ids || []).filter(Boolean);

      // Prepare run directory similar to proof-helper
      const projectRoot = this.config.getProjectRoot();
      const runDir = await (async () => {
        const p = await import('node:path');
        const fsp = await import('node:fs/promises');
        const dir = p.join(
          projectRoot,
          '.econ',
          'deep-lit-runs',
          new Date().toISOString().replace(/[:.]/g, '-'),
        );
        await fsp.mkdir(dir, { recursive: true });
        return dir;
      })();
      const p = await import('node:path');
      const fsp = await import('node:fs/promises');
      const logPath = p.join(runDir, 'log.txt');
      const requestPath = p.join(runDir, 'request.json');
      const statusPath = p.join(runDir, 'status.json');

      const log = async (line: string) => {
        try {
          await fsp.appendFile(logPath, `${line}\n`, 'utf-8');
        } catch {
          // ignore log append errors
        }
        if (updateOutput) updateOutput(line);
      };

      const tools: Array<Record<string, unknown>> = [];
      if (includeWeb) tools.push({ type: 'web_search_preview' });
      if (vectorStores.length > 0) {
        tools.push({ type: 'file_search', vector_store_ids: vectorStores });
      }
      if (includeCI) tools.push({ type: 'code_interpreter', container: { type: 'auto' } });
      if (this.params.mcp_server) {
        const { server_label, server_url, require_approval } = this.params.mcp_server;
        tools.push({
          type: 'mcp',
          server_label,
          server_url,
          require_approval: require_approval ?? 'never',
        });
      }

      const instructions = this.buildInstructions(
        this.params.query,
        this.params.instructions,
      );

      await log('[DeepLit] Starting deep research in background mode...');
      const resp = await client.responses.create({
        model,
        background: true,
        // Background mode requires stored responses
        store: true,
        reasoning: { summary: 'auto' },
        tools,
        instructions,
        input: this.params.query || instructions,
        // Attach optional metadata for correlation in dashboard/webhook handlers
        ...(this.params.metadata ? { metadata: this.params.metadata } : {}),
      } as unknown as Parameters<typeof client.responses.create>[0]);

      const id = (resp as { id?: string } | null | undefined)?.id ?? '(unknown-id)';
      const status = (resp as { status?: string } | null | undefined)?.status ?? 'queued';
      await fsp.writeFile(requestPath, JSON.stringify({
        id,
        initial_status: status,
        model,
        tools,
        input: this.params.query || instructions,
        instructions,
        metadata: this.params.metadata || null,
        started_at: new Date().toISOString(),
      }, null, 2));
      await log(`[DeepLit] Response created. id=${id} status=${status}`);

      // Poll until completion; write status updates.
      const firstPollDelaySec = 300; // first check at 5 minutes
      const subsequentDelaySec = 60; // then poll every 1 minute
      await log(
        `[DeepLit] First status check in ${firstPollDelaySec} seconds, then every ${subsequentDelaySec} seconds...`,
      );
      let currentStatus = status;
      let lastLoggedStatus = '';
      let retrieved: unknown = resp;
      let isFirstPoll = true;
      while (currentStatus === 'queued' || currentStatus === 'in_progress') {
        if (signal.aborted) {
          try {
            await log('[DeepLit] Abort requested. Cancelling background response...');
            const cancelled = await client.responses.cancel(id);
            currentStatus = (cancelled as { status?: string } | null | undefined)?.status ?? 'cancelled';
          } catch {
            // swallow cancellation errors; we're aborting
          }
          return {
            llmContent: `Error: Deep research cancelled by user. id=${id}`,
            returnDisplay: `Deep literature review cancelled. See ${p.relative(projectRoot, runDir)} for logs.`,
            error: { message: 'Cancelled', type: ToolErrorType.EXECUTION_FAILED },
          };
        }
        const delaySec = isFirstPoll ? firstPollDelaySec : subsequentDelaySec;
        await new Promise((r) => setTimeout(r, delaySec * 1000));
        isFirstPoll = false;
        try {
          retrieved = await client.responses.retrieve(id);
          currentStatus = (retrieved as { status?: string } | null | undefined)?.status ?? currentStatus;
          if (currentStatus !== lastLoggedStatus) {
            await log(`[DeepLit] Status: ${currentStatus}`);
            lastLoggedStatus = currentStatus;
          }
          await fsp.writeFile(statusPath, JSON.stringify({ id, status: currentStatus, updated_at: new Date().toISOString() }, null, 2));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          await log(`[DeepLit] Retrieve error: ${msg}`);
        }
      }

      // Terminal state reached; persist outputs
      const responsePath = p.join(runDir, 'response.json');
      await fsp.writeFile(responsePath, JSON.stringify(retrieved, null, 2));

      // Extract output text
      const extractOutputText = (r: unknown): string => {
        if (r && typeof r === 'object' && 'output_text' in r && typeof (r as { output_text?: unknown }).output_text === 'string') {
          return (r as { output_text: string }).output_text;
        }
        const outputArr = (r && typeof r === 'object' && 'output' in r && Array.isArray((r as { output?: unknown[] }).output))
          ? ((r as { output?: unknown[] }).output as unknown[])
          : [];
        const fromMessages = outputArr
          .filter((item): item is { type?: unknown; content?: unknown } => !!item && typeof item === 'object')
          .filter((item) => (item as { type?: unknown }).type === 'message')
          .flatMap((item) => Array.isArray((item as { content?: unknown[] }).content) ? ((item as { content?: unknown[] }).content as unknown[]) : [])
          .filter((ci): ci is { type?: unknown; text?: unknown } => !!ci && typeof ci === 'object')
          .filter((ci) => (ci as { type?: unknown }).type === 'output_text' && typeof (ci as { text?: unknown }).text === 'string')
          .map((ci) => (ci as { text: string }).text)
          .join('');
        if (fromMessages.trim().length > 0) return fromMessages;
        // Fallbacks similar to proof-helper
        if (r && typeof r === 'object' && 'content' in r && Array.isArray((r as { content?: unknown[] }).content)) {
          const joined = ((r as { content?: unknown[] }).content as unknown[])
            .map((ci) => (ci && typeof ci === 'object' && 'text' in ci && typeof (ci as { text?: unknown }).text === 'string' ? (ci as { text: string }).text : ''))
            .filter((s): s is string => typeof s === 'string' && s.length > 0)
            .join('\n');
          if (joined.trim().length > 0) return joined;
        }
        return '';
      };
      const outputText = extractOutputText(retrieved);

      const reportPath = p.join(runDir, 'report.md');
      await fsp.writeFile(reportPath, outputText || '(no output_text)', 'utf-8');
      await log('[DeepLit] Completed. Report written to report.md');

      // Also persist the output array for auditing
      try {
        const outputArr = (retrieved && typeof retrieved === 'object' && 'output' in retrieved)
          ? (retrieved as { output?: unknown }).output ?? null
          : null;
        if (outputArr) {
          await fsp.writeFile(p.join(runDir, 'output.json'), JSON.stringify(outputArr, null, 2));
        }
      } catch {
        // ignore write errors for auxiliary output
      }

      const success = currentStatus && (currentStatus === 'completed' || currentStatus === 'succeeded');
      if (!success) {
        const msg = `[DeepLit] Finished with status: ${currentStatus}.`;
        await log(msg);
        return {
          llmContent: outputText || msg,
          returnDisplay: `${msg} See ${p.relative(projectRoot, reportPath)} and logs for details.`,
          error: { message: msg, type: ToolErrorType.EXECUTION_FAILED },
        };
      }

      return {
        llmContent: outputText,
        returnDisplay: `Deep literature review completed. Output saved to ${p.relative(projectRoot, reportPath)}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error: ${message}`,
        returnDisplay: message,
        error: { message, type: ToolErrorType.EXECUTION_FAILED },
      };
    }
  }
}

export class DeepLiteratureReviewTool extends BaseDeclarativeTool<
  DeepLiteratureReviewParams,
  ToolResult
> {
  static readonly Name = 'deep_literature_review';

  constructor(private readonly config: Config) {
    super(
      DeepLiteratureReviewTool.Name,
      'DeepLiteratureReview',
      'Runs a Deep Research background job (OpenAI Responses API), polls until completion, and saves a cited report under .econ/deep-lit-runs/<timestamp>/',
      Kind.Think,
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'High-level research question/topic. If omitted, provide `instructions`.',
          },
          instructions: {
            type: 'string',
            description:
              'Explicit deep research instructions. If omitted, a structured prompt is generated from `query`.',
          },
          model: {
            type: 'string',
            description:
              'Optional model override (e.g., openai:o3-deep-research or openai:o4-mini-deep-research).',
          },
          include_web_search: {
            type: 'boolean',
            default: true,
            description: 'Enable web search tool (recommended).',
          },
          vector_store_ids: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Vector store IDs for file search. Enables private data grounding.',
          },
          use_code_interpreter: {
            type: 'boolean',
            default: true,
            description: 'Enable code interpreter for analysis.',
          },
          mcp_server: {
            type: 'object',
            properties: {
              server_label: { type: 'string' },
              server_url: { type: 'string' },
              require_approval: { type: 'string', enum: ['never'] },
            },
            required: ['server_label', 'server_url'],
            additionalProperties: false,
          },
          metadata: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Optional metadata for correlating via webhooks/dashboard.',
          },
        },
        required: [],
      },
      true, // isOutputMarkdown
      true, // canUpdateOutput (we stream minimal status updates)
    );
  }

  protected override validateToolParamValues(
    params: DeepLiteratureReviewParams,
  ): string | null {
    if (!params.query && !params.instructions) {
      return 'Provide either `query` or `instructions` for the research task.';
    }
    if (params.model !== undefined && params.model.trim() === '') {
      return 'If provided, `model` cannot be an empty string.';
    }
    if (params.vector_store_ids && !Array.isArray(params.vector_store_ids)) {
      return '`vector_store_ids` must be an array of strings when provided.';
    }
    return null;
  }

  protected createInvocation(
    params: DeepLiteratureReviewParams,
  ): ToolInvocation<DeepLiteratureReviewParams, ToolResult> {
    return new DeepLiteratureReviewInvocation(this.config, params);
  }
}
