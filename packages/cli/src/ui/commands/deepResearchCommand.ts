/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import type {
  CommandContext,
  SlashCommand,
  SlashCommandActionReturn,
} from './types.js';
import { CommandKind } from './types.js';

/**
 * Starts the Deep Research workflow as a focused, gated sequence:
 * 1) Summarize understanding from recent chat + ask clarifying questions
 * 2) Produce a concise Research Brief (prompt rewrite)
 * 3) Execute a deep-research provider call and save artifacts
 */
export const deepResearchCommand: SlashCommand = {
  name: 'deep',
  description: 'Enter Deep Research mode to clarify, rewrite, and execute.',
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    _args: string,
  ): Promise<SlashCommandActionReturn> => {
    if (!context.services.config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }

    const targetDir = context.services.config.getTargetDir();
    const researchDir = path.join(targetDir, 'research');

    // UI banner so the user knows we switched contexts
    context.ui.addItem(
      {
        type: 'info',
        text: 'Deep Research mode: we will summarize your request, ask brief clarifying questions, draft a research brief, then execute with the default provider/model.',
      },
      Date.now(),
    );

    // Return a submit_prompt which orchestrates the workflow at a high level
    return {
      type: 'submit_prompt',
      content: `
You are operating in Deep Research mode. Follow this minimal workflow:

Phase 1 — Clarify (use recent chat context):
- Summarize, in 4–6 bullets, what the user appears to want based on the recent conversation.
- Ask 4–6 crisp clarifying questions to remove ambiguity (scope, key sources, constraints, deliverables, timebox).
- Keep it on a single screen and wait for answers.

Phase 2 — Rewrite (Research Brief):
- After answers, produce a short, structured Research Brief in Markdown with sections:
  - Objective, Context, Constraints, Sources (initial list), Deliverables, Time Limit, Success Criteria.
- Show the brief inline, then write it to: ${path.join(
        researchDir,
        'briefs',
        '<timestamp>-brief.md',
      )}
  using the write_file tool. Use a timestamp in the filename.

Phase 3 — Execute (Tool call):
- Immediately invoke the deep_literature_review tool after writing the brief. This tool handles transport automatically: it uses OpenAI directly when OPENAI_API_KEY is available, or securely proxies via Supabase (using the CLI token) when it is not. Do not require OPENAI_API_KEY and do not run shell commands.
- Pass either a concise 'query' (one-line topic) or the full 'instructions' (the Research Brief content). Prefer 'instructions' built from the brief.
- Example tool input (conceptual):
  { "instructions": "<Research Brief markdown>", "include_web_search": true }
- The tool persists artifacts under .econ/deep-lit-runs/<timestamp>/ (request, status, response, report). Display the resulting report path to the user.
- Keep the console output concise.

Implementation notes (keep it simple for now):
- Use the existing tools:
  - write_file: to save the brief file in ${path.join(researchDir, 'briefs')}.
  - deep_literature_review: to run the background deep research job.

Provider/model (policy):
- The tool defaults to 'o4-mini-deep-research-2025-06-26' unless overridden by 'DEEP_RESEARCH_MODEL' (accepts 'openai:<model>' or raw model name).
- Do not check for or gate on OPENAI_API_KEY; the tool decides direct vs proxy.
- If the tool reports an error, display the error and stop gracefully.

Important:
- Keep the questions and summaries compact; avoid multi-screen walls of text.
- If the user declines to proceed after the brief, stop cleanly.
`,
    };
  },
};
