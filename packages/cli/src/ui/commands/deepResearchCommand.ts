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

Phase 3 — Execute (Provider call):
- Immediately call the deep research provider after writing the brief. Provider is OpenAI; use the default model unless overridden by env.
- If credentials are missing (e.g., OPENAI_API_KEY), inform the user and stop.
- Save artifacts to the project:
  - Request payload: ${path.join(
        researchDir,
        'runs',
        '<timestamp>-request.json',
      )}
  - Results/report: ${path.join(
        researchDir,
        'results',
        '<timestamp>-report.md',
      )}
  - Optional sources/citations JSON: ${path.join(
        researchDir,
        'results',
        '<timestamp>-sources.json',
      )}
- Use write_file for saving artifacts. Keep outputs concise and clearly labeled.

Implementation notes (keep it simple for now):
- Use the existing tools:
  - write_file: to save the brief, request, and results
  - run_shell_command: to invoke the provider (e.g., curl). The CLI may present a confirmation dialog for network calls.

Provider/model (fixed policy, env override):
- Provider: OpenAI only.
- Models allowed:
  - Default: o4-mini-deep-research-2025-06-26
  - Alternative: o3-deep-research-2025-06-26
- Resolve from env like the proof helper: if DEEP_RESEARCH_MODEL is set to \`openai:o4-mini-deep-research-2025-06-26\` or \`openai:o3-deep-research-2025-06-26\`, use that; otherwise use the default.

Example (OpenAI Responses API):
  MODEL="\${DEEP_RESEARCH_MODEL#openai:}"
  [ -z "\$MODEL" ] && MODEL="o4-mini-deep-research-2025-06-26"
  curl -sS https://api.openai.com/v1/responses \\
    -H "Authorization: Bearer \$OPENAI_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{\
      \"model\": \"\$MODEL\",\
      \"input\": [ { \"role\": \"user\", \"content\": \"<research brief or question>\" } ]\
    }"

- If unavailable (no credentials) or the call fails, clearly state what is missing and exit Deep Research mode gracefully after providing the brief.

Important:
- Keep the questions and summaries compact; avoid multi-screen walls of text.
- If the user declines to proceed after the brief, stop cleanly.
`,
    };
  },
};
