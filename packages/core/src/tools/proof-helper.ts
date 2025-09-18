/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import { ToolErrorType } from './tool-error.js';
import type { Config } from '../config/config.js';
import type { GenerateContentConfig, Content } from '@google/genai';
import { getResponseText } from '../utils/partUtils.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createContentGenerator } from '../core/contentGenerator.js';
import OpenAI from 'openai';

// Prompts copied verbatim from prover.py
const step1Prompt = `
### Core Instructions ###

*   **Rigor is Paramount:** Your primary goal is to produce a complete and rigorously justified solution. Every step in your solution must be logically sound and clearly explained. A correct final answer derived from flawed or incomplete reasoning is considered a failure.
*   **Honesty About Completeness:** If you cannot find a complete solution, you must **not** guess or create a solution that appears correct but contains hidden flaws or justification gaps. Instead, you should present only significant partial results that you can rigorously prove. A partial result is considered significant if it represents a substantial advancement toward a full solution. Examples include:
    *   Proving a key lemma.
    *   Fully resolving one or more cases within a logically sound case-based proof.
    *   Establishing a critical property of the mathematical objects in the problem.
    *   For an optimization problem, proving an upper or lower bound without proving that this bound is achievable.
*   **Use TeX for All Mathematics:** Wrap inline math in \`$...$\` and display equations in \`$$...$$\`. Do **not** use \`\\[\` or \`\\]\`. Example: \\\`Let $n$ be an integer.\\\` or \\\`$$f(x)=x^2$$\\\`.

### Output Format ###

Your response MUST be structured into the following sections, in this exact order.

**1. Summary**

Provide a concise overview of your findings. This section must contain two parts:

*   **a. Verdict:** State clearly whether you have found a complete solution or a partial solution.
    *   **For a complete solution:** State the final answer, e.g., "I have successfully solved the problem. The final answer is..."
    *   **For a partial solution:** State the main rigorous conclusion(s) you were able to prove, e.g., "I have not found a complete solution, but I have rigorously proven that..."
*   **b. Method Sketch:** Present a high-level, conceptual outline of your solution. This sketch should allow an expert to understand the logical flow of your argument without reading the full detail. It should include:
    *   A narrative of your overall strategy.
    *   The full and precise mathematical statements of any key lemmas or major intermediate results.
    *   If applicable, describe any key constructions or case splits that form the backbone of your argument.

**2. Detailed Solution**

Present the full, step-by-step mathematical proof. Each step must be logically justified and clearly explained. The level of detail should be sufficient for an expert to verify the correctness of your reasoning without needing to fill in any gaps. This section must contain ONLY the complete, rigorous proof, free of any internal commentary, alternative approaches, or failed attempts. Enclose this section between the markers <<<BEGIN DETAILED SOLUTION>>> and <<<END DETAILED SOLUTION>>>. Inside these markers, continue to format every mathematical expression using \`$...$\` or \`$$...$$\` (never \`\\[\` or \`\\]\`).

### Self-Correction Instruction ###

Before finalizing your output, carefully review your "Method Sketch" and "Detailed Solution" to ensure they are clean, rigorous, and strictly adhere to all instructions provided above. Verify that every statement contributes directly to the final, coherent mathematical argument.
`;

const selfImprovementPrompt = `
You have an opportunity to improve your solution. Please review your solution carefully. Correct errors and fill justification gaps if any. Your second round of output should strictly follow the instructions in the system prompt.
`;

const correctionPrompt = `
Below is the bug report. If you agree with certain item in it, can you improve your solution so that it is complete and rigorous? Note that the evaluator who generates the bug report can misunderstand your solution and thus make mistakes. If you do not agree with certain item in the bug report, please add some detailed explanations to avoid such misunderstanding. Your new solution should strictly follow the instructions in the system prompt.
`;

const verificationSystemPrompt = `
You are an expert mathematician and a meticulous grader for an International Mathematical Olympiad (IMO) level exam. Your primary task is to rigorously verify the provided mathematical solution. A solution is to be judged correct **only if every step is rigorously justified.** A solution that arrives at a correct final answer through flawed reasoning, educated guesses, or with gaps in its arguments must be flagged as incorrect or incomplete.

### Instructions ###

**1. Core Instructions**
*   Your sole task is to find and report all issues in the provided solution. You must act as a **verifier**, NOT a solver. **Do NOT attempt to correct the errors or fill the gaps you find.**
*   You must perform a **step-by-step** check of the entire solution. This analysis will be presented in a **Detailed Verification Log**, where you justify your assessment of each step: for correct steps, a brief justification suffices; for steps with errors or gaps, you must provide a detailed explanation.

**2. How to Handle Issues in the Solution**
When you identify an issue in a step, you MUST first classify it into one of the following two categories and then follow the specified procedure.

*   **a. Critical Error:**
    This is any error that breaks the logical chain of the proof. This includes both **logical fallacies** (e.g., claiming that \`A>B, C>D\` implies \`A-C>B-D\`) and **factual errors** (e.g., a calculation error like \`2+3=6\`).
    *   **Procedure:**
        *   Explain the specific error and state that it **invalidates the current line of reasoning**.
        *   Do NOT check any further steps that rely on this error.
        *   You MUST, however, scan the rest of the solution to identify and verify any fully independent parts. For example, if a proof is split into multiple cases, an error in one case does not prevent you from checking the other cases.

*   **b. Justification Gap:**
    This is for steps where the conclusion may be correct, but the provided argument is incomplete, hand-wavy, or lacks sufficient rigor.
    *   **Procedure:**
        *   Explain the gap in the justification.
        *   State that you will **assume the step's conclusion is true** for the sake of argument.
        *   Then, proceed to verify all subsequent steps to check if the remainder of the argument is sound.

**3. Output Format**
Your response MUST be structured into two main sections: a **Summary** followed by the **Detailed Verification Log**.

*   **a. Summary**
    This section MUST be at the very beginning of your response. It must contain two components:
    *   **Final Verdict**: A single, clear sentence declaring the overall validity of the solution. For example: "The solution is correct," "The solution contains a Critical Error and is therefore invalid," or "The solution's approach is viable but contains several Justification Gaps."
    *   **List of Findings**: A bulleted list that summarizes **every** issue you discovered. For each finding, you must provide:
        *   **Location:** A direct quote of the key phrase or equation where the issue occurs.
        *   **Issue:** A brief description of the problem and its classification (**Critical Error** or **Justification Gap**).

*   **b. Detailed Verification Log**
    Following the summary, provide the full, step-by-step verification log as defined in the Core Instructions. When you refer to a specific part of the solution, **quote the relevant text** to make your reference clear before providing your detailed analysis of that part. Enclose the detailed log between the markers <<<BEGIN LOG>>> and <<<END LOG>>>.

**Example of the Required Summary Format**
*This is a generic example to illustrate the required format. Your findings must be based on the actual solution provided below.*

**Final Verdict:** The solution is **invalid** because it contains a Critical Error.

**List of Findings:**
*   **Location:** "By interchanging the limit and the integral, we get..."
    *   **Issue:** Justification Gap - The solution interchanges a limit and an integral without providing justification, such as proving uniform convergence.
*   **Location:** "From $A > B$ and $C > D$, it follows that $A-C > B-D$"
    *   **Issue:** Critical Error - This step is a logical fallacy. Subtracting inequalities in this manner is not a valid mathematical operation.
`;

const verificationReminder = `
### Verification Task Reminder ###

Your task is to act as an IMO grader. Now, generate the **summary** and the **step-by-step verification log** for the solution above. In your log, justify each correct step and explain in detail any errors or justification gaps you find, as specified in the instructions above. Remember to wrap the detailed log between <<<BEGIN LOG>>> and <<<END LOG>>> markers.
`;

// Parameters for the tool
export interface ProofHelperParams {
  // Either provide the problem statement directly...
  problem?: string;
  // ...or provide a path (absolute) to a file or a folder containing the statement.
  problem_path?: string;
  // Optional model override for this proof run (e.g., gemini-2.5-pro).
  model?: string;
  other_prompts?: string[];
  max_runs?: number;
  verbose?: boolean;
}

class ProofHelperInvocation extends BaseToolInvocation<
  ProofHelperParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: ProofHelperParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return 'Run the proof helper on the provided problem statement.';
  }

  override async shouldConfirmExecute(): Promise<import('./tools.js').ToolCallConfirmationDetails | false> {
    return {
      type: 'info',
      title: 'Run Proof Helper (long-running)',
      onConfirm: async () => {},
      prompt: `Proof helper may run for a while.

Optional tweaks
- Pass other_prompts to steer the approach; they will also be saved to other_prompts.md.
- Override the proof model via the model parameter or /set PROOF_HELPER_MODEL.
- For GPT-5 runs, choose the reasoning effort with /set GPT5_REASONING_EFFORT low|medium|high (default: low).

Outputs
- other_prompts.md (only when other_prompts are provided)
- Logs: .econ/proof-runs/<timestamp>/log.txt
- Solution: .econ/proof-runs/<timestamp>/solution.md

Tip: You can keep working in another chat while this finishes.`,
    };
  }

  private getModel(): string {
    return this.config.getModel();
  }

  private freshPromptId: string | undefined;
  private freshGenerator: Awaited<ReturnType<typeof createContentGenerator>> | undefined;
  private effectiveModel: string | undefined;
  private provider: 'gemini' | 'openai' = 'gemini';

  private openaiClient: OpenAI | undefined;

  private ensureOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env['OPENAI_API_KEY']?.trim();
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required to use OpenAI models.');
      }
      const baseURL =
        process.env['OPENAI_BASE_URL']?.trim() ||
        process.env['PROOF_HELPER_OPENAI_BASE_URL']?.trim() ||
        undefined;
      this.openaiClient = new OpenAI({
        apiKey,
        baseURL,
      });
    }
    return this.openaiClient!;
  }


  private async ensureFreshGenerator(): Promise<
    Awaited<ReturnType<typeof createContentGenerator>>
  > {
    // Resolve provider and model from env if not yet set
    if (!this.effectiveModel) {
      const base = this.config.getContentGeneratorConfig();
      const override = this.params.model?.trim();
      if (override) {
        if (override.toLowerCase().startsWith('openai:')) {
          this.provider = 'openai';
          this.effectiveModel = override.slice('openai:'.length).trim();
          console.log(
            `[ProofHelper] Using OpenAI provider with override model: "${this.effectiveModel}"`,
          );
        } else {
          this.provider = 'gemini';
          this.effectiveModel = override;
          console.log(
            `[ProofHelper] Using Gemini provider with override model: "${this.effectiveModel}"`,
          );
        }
      } else {
        const raw = process.env['PROOF_HELPER_MODEL']?.trim();
        console.log(`[ProofHelper] PROOF_HELPER_MODEL env var: "${raw}"`);
        if (raw && raw.toLowerCase().startsWith('openai:')) {
          this.provider = 'openai';
          this.effectiveModel = raw.slice('openai:'.length).trim();
          console.log(
            `[ProofHelper] Using OpenAI provider with model: "${this.effectiveModel}"`,
          );
        } else if (raw && raw.length > 0) {
          this.provider = 'gemini';
          this.effectiveModel = raw;
          console.log(
            `[ProofHelper] Using Gemini provider with model: "${this.effectiveModel}"`,
          );
        } else {
          const openaiKey = process.env['OPENAI_API_KEY']?.trim();
          if (openaiKey && openaiKey.length > 0) {
            this.provider = 'openai';
            this.effectiveModel = 'gpt-5-nano-2025-08-07';
            console.log(
              `[ProofHelper] Using default OpenAI model: "${this.effectiveModel}"`,
            );
          } else {
            this.provider = 'gemini';
            this.effectiveModel = base.model;
            console.log(
              `[ProofHelper] Using default Gemini model: "${this.effectiveModel}"`,
            );
          }
        }
      }
    }

    if (this.provider === 'openai') {
      // OpenAI path does not use Gemini content generator
      return undefined as unknown as Awaited<ReturnType<typeof createContentGenerator>>;
    }

    if (!this.freshGenerator) {
      // Create a fresh content generator, isolated from the main chat history
      const sessionId = `proof-${Date.now()}`;
      this.freshPromptId = sessionId;
      const base = this.config.getContentGeneratorConfig();
      const cgConfig = { ...base, model: this.effectiveModel };
      this.freshGenerator = await createContentGenerator(
        cgConfig,
        this.config,
        sessionId,
      );
    }
    return this.freshGenerator;
  }

  private async readProblemFromPath(problemPath: string): Promise<string> {
    // If it's a file, read directly. If directory, look for common filenames.
    const stat = await fs.stat(problemPath).catch(() => null);
    if (!stat) {
      throw new Error(`Problem path not found: ${problemPath}`);
    }
    if (stat.isFile()) {
      return await fs.readFile(problemPath, 'utf-8');
    }
    if (stat.isDirectory()) {
      const candidates = [
        'problem_statement.txt',
        'problem.txt',
        'problem.md',
        'PROBLEM.md',
        'statement.txt',
        'statement.md',
      ];
      const entries = await fs.readdir(problemPath);
      for (const name of candidates) {
        if (entries.includes(name)) {
          const p = path.join(problemPath, name);
          return await fs.readFile(p, 'utf-8');
        }
      }
      throw new Error(
        `No problem file found in folder. Expected one of: ${candidates.join(', ')}`,
      );
    }
    throw new Error(`Problem path is neither a file nor a directory: ${problemPath}`);
  }

  private async generate(
    systemInstruction: string,
    contents: Content[],
    abortSignal: AbortSignal,
  ): Promise<string> {
    // Ensure provider/model resolution and generator readiness
    await this.ensureFreshGenerator();
    if (this.provider === 'openai') {
      return await this.generateViaOpenAI(systemInstruction, contents, abortSignal);
    }
    const reqConfig: GenerateContentConfig = {
      temperature: 0.1,
      topP: 1.0,
      systemInstruction,
      thinkingConfig: { thinkingBudget: 32768 },
      abortSignal,
    };
    const generator = await this.ensureFreshGenerator();
    const response = await generator.generateContent(
      {
        model: this.effectiveModel || this.getModel(),
        config: reqConfig,
        contents,
      },
      this.freshPromptId || this.config.getSessionId(),
    );
    const text = getResponseText(response);
    return text ?? '';
  }

  private async generateViaOpenAI(
    systemInstruction: string,
    contents: Content[],
    abortSignal: AbortSignal,
  ): Promise<string> {
    const openaiModel = this.effectiveModel;
    if (!openaiModel || openaiModel.length === 0) {
      throw new Error('PROOF_HELPER_MODEL is set to openai but model name is missing. Use PROOF_HELPER_MODEL=openai:<model>.');
    }
    const client = this.ensureOpenAIClient();

    const systemMsg = systemInstruction?.trim() ? systemInstruction.trim() : undefined;

    const userAssistantMessages: Array<{
      role: 'user' | 'assistant';
      content: string;
      type: 'message';
    }> = [];
    for (const c of contents) {
      const role = c.role === 'model' ? 'assistant' : 'user';
      if (role !== 'user' && role !== 'assistant') continue;
      type TextLike = { text?: unknown };
      const textParts = (c.parts || [])
        .map((p) => {
          const maybe = p as TextLike;
          return typeof maybe.text === 'string' ? maybe.text : '';
        })
        .filter(Boolean) as string[];
      if (textParts.length > 0) {
        userAssistantMessages.push({
          role,
          content: textParts.join('\n\n'),
          type: 'message',
        });
      }
    }

    const isGpt5 = openaiModel.toLowerCase().startsWith('gpt-5');
    if (isGpt5) {
      // Use Responses API with reasoning
      const reasoningEffortEnv = process.env['GPT5_REASONING_EFFORT']?.trim()?.toLowerCase() as 'low' | 'medium' | 'high' | undefined;
      const defaultEffort: 'low' | 'medium' | 'high' = 'low';
      const reasoningEffort = (['low','medium','high'] as const).includes(reasoningEffortEnv ?? defaultEffort)
        ? (reasoningEffortEnv ?? defaultEffort)
        : defaultEffort;

      // Responses API expects "input" as an array of role/content items
      const resp = await client.responses.create(
        {
          model: openaiModel,
          reasoning: { effort: reasoningEffort },
          instructions: systemMsg,
          input: userAssistantMessages,
        },
        { signal: abortSignal },
      );

      // Try multiple access patterns for robustness across SDK versions
      const extractFromResponses = (r: unknown): string => {
        const maybeObj = r as {
          output_text?: unknown;
          output?: Array<{ content?: Array<{ text?: unknown }> }>;
          content?: Array<{ text?: unknown }>;
        };
        if (typeof maybeObj?.output_text === 'string') return maybeObj.output_text;
        if (Array.isArray(maybeObj?.output)) {
          const joined = maybeObj.output
            .map((o) =>
              Array.isArray(o?.content)
                ? o.content
                    .map((ci) => (typeof ci?.text === 'string' ? ci.text : ''))
                    .filter(Boolean)
                    .join('\n')
                : ''
            )
            .join('\n');
          if (joined.trim().length > 0) return joined;
        }
        if (Array.isArray(maybeObj?.content)) {
          const joined = maybeObj.content
            .map((ci) => (typeof ci?.text === 'string' ? ci.text : ''))
            .filter(Boolean)
            .join('\n');
          if (joined.trim().length > 0) return joined;
        }
        return '';
      };

      const outputText = extractFromResponses(resp);
      return outputText;
    } else {
      // Use Chat Completions for non-GPT-5 models
      const baseMessages = userAssistantMessages.map(({ role, content }) => ({
        role,
        content,
      }));

      const chatMessages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }> = systemMsg
        ? [{ role: 'system', content: systemMsg }, ...baseMessages]
        : baseMessages;

      const cc = await client.chat.completions.create(
        {
          model: openaiModel,
          messages: chatMessages,
          temperature: 0.1,
          top_p: 1.0,
        },
        { signal: abortSignal },
      );
      return cc.choices?.[0]?.message?.content ?? '';
    }
}

  private extractBetweenMarkers(
    src: string,
    begin: string,
    end: string,
  ): string {
    const startIdx = src.indexOf(begin);
    if (startIdx === -1) return '';
    const endIdx = src.indexOf(end, startIdx + begin.length);
    if (endIdx === -1) return '';
    return src.substring(startIdx + begin.length, endIdx).trim();
  }

  private extractSection(src: string, header: string): string {
    const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `^\\s*(?:[#>*\\d.()\\[\\]\\-]+\\s*)*${escaped}\\s*\\n+([\\s\\S]*)$`,
      'im',
    );
    const match = src.match(re);
    return match ? match[1].trim() : '';
  }

  private extractDetailedSolution(solution: string): string {
    const tagged = this.extractBetweenMarkers(
      solution,
      '<<<BEGIN DETAILED SOLUTION>>>',
      '<<<END DETAILED SOLUTION>>>',
    );
    if (tagged) {
      return tagged;
    }

    const section = this.extractSection(solution, 'Detailed Solution');
    if (section) {
      return section;
    }

    const marker = 'detailed solution';
    const lower = solution.toLowerCase();
    const markerIdx = lower.indexOf(marker);
    if (markerIdx !== -1) {
      const newlineIdx = solution.indexOf('\n', markerIdx);
      if (newlineIdx !== -1) {
        return solution.substring(newlineIdx + 1).trim();
      }
      return solution.substring(markerIdx + marker.length).trim();
    }

    return solution.trim();
  }

  private extractDetailedVerificationLog(src: string): string {
    const tagged = this.extractBetweenMarkers(src, '<<<BEGIN LOG>>>', '<<<END LOG>>>');
    if (tagged) {
      return tagged;
    }
    return this.extractSection(src, 'Detailed Verification Log');
  }

  private isYes(response: string): boolean {
    const normalized = response.trim().toLowerCase();
    return /^(yes|y)$/.test(normalized);
  }

  private async verifySolution(
    problem: string,
    solution: string,
    abortSignal: AbortSignal,
    verbose = true,
    updateOutput?: (out: string) => void,
  ): Promise<{ bugReport: string; verdictYesNo: string }> {
    const dsol = this.extractDetailedSolution(solution);

    const newst = `
======================================================================
### Problem ###

${problem}

======================================================================
### Solution ###

${dsol}

${verificationReminder}
`;
    if (verbose) {
      updateOutput?.('>>>>>>> Start verification.');
    }

    const verificationContents: Content[] = [
      { role: 'user', parts: [{ text: newst }] },
    ];

    const out = await this.generate(
      verificationSystemPrompt,
      verificationContents,
      abortSignal,
    );

    if (verbose) {
      updateOutput?.('>>>>>>> Verification results:');
      updateOutput?.(out);
    }

    const checkCorrectness =
      'Response in "yes" or "no". Is the following statement saying the solution is correct, or does not contain critical error or a major justification gap?' +
      '\n\n' +
      out;

    const yesNo = await this.generate(
      '',
      [{ role: 'user', parts: [{ text: checkCorrectness }] }],
      abortSignal,
    );

    if (verbose) {
      updateOutput?.('>>>>>>> Is verification good?');
      updateOutput?.(yesNo);
    }

    let bugReport = '';
    if (!this.isYes(yesNo)) {
      bugReport = this.extractDetailedVerificationLog(out) || out.trim();
    }

    if (verbose) {
      updateOutput?.('>>>>>>>Bug report:');
      updateOutput?.(bugReport || '(empty)');
    }

    return { bugReport, verdictYesNo: yesNo };
  }

  private async checkIfSolutionClaimedComplete(
    solution: string,
    abortSignal: AbortSignal,
  ): Promise<boolean> {
    const checkCompletePrompt = `
Is the following text claiming that the solution is complete?
==========================================================

${solution}

==========================================================

Response in exactly "yes" or "no". No other words.
    `;

    const o = await this.generate(
      '',
      [{ role: 'user', parts: [{ text: checkCompletePrompt }] }],
      abortSignal,
    );
    return this.isYes(o);
  }

  private async initExplorations(
    problem: string,
    abortSignal: AbortSignal,
    otherPrompts: string[] = [],
    verbose = true,
    updateOutput?: (out: string) => void,
  ): Promise<
    | {
        contents: Content[];
        solution: string;
        bugReport: string;
        verdictYesNo: string;
      }
    | null
  > {
    const contents: Content[] = [
      { role: 'user', parts: [{ text: problem }] },
      ...otherPrompts.map((p) => ({ role: 'user', parts: [{ text: p }] } as Content)),
    ];

    if (verbose) {
      updateOutput?.('>>>>>> Initial prompt.');
    }

    const first = await this.generate(step1Prompt, contents, abortSignal);
    if (verbose) {
      updateOutput?.('>>>>>>> First solution:');
      updateOutput?.(first);
      updateOutput?.('>>>>>>> Self improvement start:');
    }

    contents.push({ role: 'model', parts: [{ text: first }] });
    contents.push({ role: 'user', parts: [{ text: selfImprovementPrompt }] });

    const solution = await this.generate(step1Prompt, contents, abortSignal);
    if (verbose) {
      updateOutput?.('>>>>>>> Corrected solution:');
      updateOutput?.(solution);
    }

    if (verbose) {
      updateOutput?.('>>>>>>> Check if solution is complete:');
    }
    const isComplete = await this.checkIfSolutionClaimedComplete(
      solution,
      abortSignal,
    );
    if (!isComplete) {
      if (verbose) updateOutput?.('>>>>>>> Solution is not complete. Failed.');
      return null;
    }

    if (verbose) updateOutput?.('>>>>>>> Vefify the solution.');
    const { bugReport, verdictYesNo } = await this.verifySolution(
      problem,
      solution,
      abortSignal,
      verbose,
      updateOutput,
    );

    if (verbose) {
      updateOutput?.('>>>>>>> Initial verification:');
      updateOutput?.(bugReport || '(empty)');
      updateOutput?.(`>>>>>>> verify results: ${verdictYesNo}`);
    }

    return { contents, solution, bugReport, verdictYesNo };
  }

  async execute(
    signal: AbortSignal,
    updateOutput?: (output: string) => void,
  ): Promise<ToolResult> {
    try {
      // Prefer problem_path if provided; otherwise use inline problem text
      let problem = this.params.problem?.trim() || '';
      if (this.params.problem_path && this.params.problem_path.trim() !== '') {
        problem = await this.readProblemFromPath(this.params.problem_path.trim());
      }
      if (!problem) {
        return {
          llmContent: 'Error: Missing problem statement.',
          returnDisplay:
            'Missing problem statement. Provide `problem_path` (preferred) or `problem`.',
          error: {
            message:
              'Missing problem statement. Provide `problem_path` (preferred) or `problem`.',
            type: ToolErrorType.INVALID_TOOL_PARAMS,
          },
        };
      }
      const otherPrompts = this.params.other_prompts ?? [];
      const maxRuns = this.params.max_runs ?? 10;
      const verbose = this.params.verbose ?? true;

      // Create dedicated folder and write the statement before running
      const projectRoot = this.config.getProjectRoot();
      const runDir = path.join(
        projectRoot,
        '.econ',
        'proof-runs',
        new Date().toISOString().replace(/[:.]/g, '-'),
      );
      await fs.mkdir(runDir, { recursive: true });
      const problemPath = path.join(runDir, 'problem.txt');
      const promptsPath = path.join(runDir, 'other_prompts.json');
      const promptsMarkdownPath = path.join(runDir, 'other_prompts.md');
      const logPath = path.join(runDir, 'log.txt');
      await fs.writeFile(problemPath, problem, 'utf-8');
      if (otherPrompts.length > 0) {
        await fs.writeFile(promptsPath, JSON.stringify(otherPrompts, null, 2), 'utf-8');
        const markdown = ['# Additional prompts', ''];
        for (const prompt of otherPrompts) {
          markdown.push(`- ${prompt}`);
        }
        markdown.push('');
        await fs.writeFile(promptsMarkdownPath, markdown.join('\n'), 'utf-8');
      }

      const appendLog = async (line: string) => {
        try {
          await fs.appendFile(logPath, `${line}\n`, 'utf-8');
        } catch {
          // ignore logging errors
        }
      };
      const logAndStream = (msg: string) => {
        if (verbose) updateOutput?.(msg);
        void appendLog(msg);
      };

      // Record provider/model selection for auditability
      try {
        const rawModelEnv = process.env['PROOF_HELPER_MODEL']?.trim() || '';
        await this.ensureFreshGenerator();
        logAndStream(
          `[ProofHelper] Model env: "${rawModelEnv || '(unset)'}"`,
        );
        logAndStream(
          `[ProofHelper] Provider: ${this.provider}, Model: "${this.effectiveModel}"`,
        );
        if (this.provider === 'openai' && (this.effectiveModel || '').toLowerCase().startsWith('gpt-5')) {
          const reasoningEffortEnv = process
            .env['GPT5_REASONING_EFFORT']?.trim()
            ?.toLowerCase() as 'low' | 'medium' | 'high' | undefined;
          const defaultEffort: 'low' | 'medium' | 'high' = 'low';
          const effort = (['low', 'medium', 'high'] as const).includes(
            reasoningEffortEnv ?? defaultEffort,
          )
            ? (reasoningEffortEnv ?? defaultEffort)
            : defaultEffort;
          logAndStream(`[ProofHelper] GPT5 reasoning effort: ${effort}`);
        }
      } catch {
        // non-fatal
      }

      let finalSolution: string | null = null;
      let lastError: string | undefined;

      for (let run = 0; run < maxRuns && !signal.aborted; run++) {
        logAndStream(`\n\n>>>>>>>>>>>>>>>>>>>>>>>>>> Run ${run} of ${maxRuns} ...`);
        try {
          const init = await this.initExplorations(
            problem,
            signal,
            otherPrompts,
            verbose,
            logAndStream,
          );

          if (!init) {
            lastError = 'Initial attempt did not yield a complete solution.';
            continue;
          }

          let { solution, bugReport, verdictYesNo } = init;

          if (!solution) {
            lastError = 'No solution produced.';
            continue;
          }

          let errorCount = 0;
          let correctCount = 1;

          for (let i = 0; i < 30 && !signal.aborted; i++) {
            if (verbose)
              updateOutput?.(
                `Number of iterations: ${i}, number of corrects: ${correctCount}, number of errors: ${errorCount}`,
              );

            if (!this.isYes(verdictYesNo)) {
              // clear
              correctCount = 0;
              errorCount += 1;

              logAndStream('>>>>>>> Verification does not pass, correcting ...');

              // establish a new prompt that contains the solution and the verification
              const newContents: Content[] = [
                { role: 'user', parts: [{ text: problem }] },
                ...otherPrompts.map(
                  (p) => ({ role: 'user', parts: [{ text: p }] }) as Content,
                ),
                { role: 'model', parts: [{ text: solution }] },
                {
                  role: 'user',
                  parts: [
                    { text: correctionPrompt },
                    { text: bugReport ?? '' },
                  ],
                },
              ];

              logAndStream('>>>>>>> New prompt:');

              solution = await this.generate(
                step1Prompt,
                newContents,
                signal,
              );

              logAndStream('>>>>>>> Corrected solution:');
              logAndStream(solution);

              if (verbose) updateOutput?.('>>>>>>> Check if solution is complete:');
              const isComplete = await this.checkIfSolutionClaimedComplete(
                solution,
                signal,
              );
              if (!isComplete) {
                logAndStream('>>>>>>> Solution is not complete. Failed.');
                lastError = 'Solution failed completeness check.';
                break;
              }
            }

            logAndStream('>>>>>>> Verify the solution.');
            const verification = await this.verifySolution(
              problem,
              solution,
              signal,
              verbose,
              logAndStream,
            );
            bugReport = verification.bugReport;
            verdictYesNo = verification.verdictYesNo;

            if (this.isYes(verdictYesNo)) {
              logAndStream('>>>>>>> Solution is good, verifying again ...');
              correctCount += 1;
              errorCount = 0;
            }

            if (correctCount >= 5) {
              logAndStream('>>>>>>> Correct solution found.');
              finalSolution = solution;
              break;
            } else if (errorCount >= 10) {
              logAndStream('>>>>>>> Failed in finding a correct solution.');
              lastError = 'Exceeded maximum error threshold while iterating.';
              break;
            }
          }

          if (finalSolution) break; // exit runs
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          lastError = msg;
          logAndStream(`>>>>>>> Error in run ${run}: ${msg}`);
          continue;
        }
      }

      if (!finalSolution) {
        return {
          llmContent: 'No correct solution found.',
          returnDisplay: `${lastError || 'No correct solution found.'} (See ${path.relative(projectRoot, runDir)} for logs)`,
          error: {
            message: lastError || 'No correct solution found.',
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }

      // Persist the solution to the run directory
      const solutionPath = path.join(runDir, 'solution.md');
      await fs.writeFile(solutionPath, finalSolution, 'utf-8');

      return {
        llmContent: finalSolution,
        returnDisplay: `Proof helper completed successfully. Output saved to ${path.relative(projectRoot, solutionPath)}`,
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

export class ProofHelperTool extends BaseDeclarativeTool<
  ProofHelperParams,
  ToolResult
> {
  static readonly Name = 'proof_helper';

  constructor(private readonly config: Config) {
    super(
      ProofHelperTool.Name,
      'ProofHelper',
      'Generates a rigorous mathematical solution (or significant partial results) to a problem using a solve–verify–refine loop.',
      Kind.Think,
      {
        type: 'object',
        properties: {
          problem: {
            type: 'string',
            description: 'The problem statement to solve.',
          },
          problem_path: {
            type: 'string',
            description:
              'Absolute path to a problem file or a folder containing the statement (e.g., problem_statement.txt).',
          },
          other_prompts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional additional user prompts to include in the initial conversation.',
          },
          model: {
            type: 'string',
            description:
              'Optional model override. Use gemini model names directly or prefix with openai: to select an OpenAI model.',
          },
          max_runs: {
            type: 'integer',
            minimum: 1,
            default: 10,
            description: 'Maximum number of outer runs to attempt.',
          },
          verbose: {
            type: 'boolean',
            default: true,
            description: 'Whether to stream progress logs in the tool output.',
          },
        },
        required: [],
      },
      true, // isOutputMarkdown
      true, // canUpdateOutput (we stream logs)
    );
  }

  protected override validateToolParamValues(
    params: ProofHelperParams,
  ): string | null {
    if (!params.problem_path && !params.problem) {
      return 'Provide either `problem_path` (preferred) or `problem`.';
    }
    if (params.problem_path && params.problem_path.trim() === '') {
      return '`problem_path` cannot be empty when provided.';
    }
    if (params.model !== undefined && params.model.trim() === '') {
      return 'If provided, `model` cannot be an empty string.';
    }
    if (params.other_prompts && !Array.isArray(params.other_prompts)) {
      return 'The "other_prompts" parameter must be an array of strings.';
    }
    return null;
  }

  protected createInvocation(
    params: ProofHelperParams,
  ): ToolInvocation<ProofHelperParams, ToolResult> {
    return new ProofHelperInvocation(this.config, params);
  }
}
