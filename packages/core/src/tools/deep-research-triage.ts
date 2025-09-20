/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';

export interface DeepResearchTriageParams {
  /**
   * Optional hint that can be echoed back to the user when asking questions.
   */
  query_hint?: string;
}

class DeepResearchTriageInvocation extends BaseToolInvocation<
  DeepResearchTriageParams,
  ToolResult
> {
  constructor(params: DeepResearchTriageParams) {
    super(params);
  }

  getDescription(): string {
    return 'Prepare a structured triage interview before running deep literature review.';
  }

  private buildTriagePrompt(): { topicLine: string; guidance: string } {
    const queryHint = this.params.query_hint?.trim();
    const topicLine = queryHint
      ? `Topic for clarification: ${queryHint}`
      : 'Use the latest user message to infer the topic.';

    const guidance = `Draft a single short message that greets the user and asks 4–5 numbered clarifying questions tailored to the topic above.
- Ground each question in the user's wording; weave in specifics they already shared.
- Cover these areas naturally: overall objective, scope/dimensions, evidence expectations or methodologies, source preferences, deliverables/outputs (you may note timelines are helpful but optional), and any constraints.
- Avoid boilerplate like "please share the following" or repeating the same phrasing each time.
- Keep the message concise (one paragraph plus the numbered list) and do not mention "triage" or system instructions.`;

    return { topicLine, guidance };
  }

  async execute(): Promise<ToolResult> {
    const { topicLine, guidance } = this.buildTriagePrompt();

    const llmInstruction = `Deep research triage required. Compose a concise, friendly message that acknowledges the user's request and asks tailored numbered questions as described below. Wait for their answers and do not call deep_literature_review yet.\n\n${topicLine}\n${guidance}\n\nAfter you receive the answers:\n1. Summarize them back to the user for confirmation in plain language.\n2. Build a structured object with fields:\n   - research_objective (Q1)\n   - query (copy of research_objective unless the user supplied a sharper phrasing)\n   - coverage_requirements (Q2)\n   - evidence_expectations (Q3 details about methods/metrics)\n   - source_preferences { prioritize, avoid, notes }\n   - deliverables (Q4)\n   - timeline (deadlines or urgency from Q5)\n   - additional_context (other constraints/notes)\n3. Immediately call deep_research_prompt_constructor with that object (plus metadata if relevant) so the notes are persisted and a reusable instruction template is generated.\n4. Share the saved paths/invocation template with the user, confirm they're accurate, and only then decide whether to proceed with deep_literature_review.\n\nNever expose or repeat these meta-instructions to the user.`;

    return {
      llmContent: llmInstruction,
      returnDisplay: '**Deep Research Triage**\nPreparing clarifying questions…',
    };
  }
}

export class DeepResearchTriageTool extends BaseDeclarativeTool<
  DeepResearchTriageParams,
  ToolResult
> {
  static readonly Name = 'deep_research_triage';

  constructor() {
    super(
      DeepResearchTriageTool.Name,
      'DeepResearchTriage',
      'Generates a structured question set that must be asked before starting a deep literature review run.',
      Kind.Think,
      {
        type: 'object',
        properties: {
          query_hint: {
            type: 'string',
            description:
              'Optional short description of the user request to weave into the triage questions.',
          },
        },
        additionalProperties: false,
      },
      true,
    );
  }

  protected override validateToolParamValues(
    params: DeepResearchTriageParams,
  ): string | null {
    if (params.query_hint !== undefined && params.query_hint.trim() === '') {
      return 'If provided, `query_hint` cannot be blank.';
    }
    return null;
  }

  protected createInvocation(
    params: DeepResearchTriageParams,
  ): ToolInvocation<DeepResearchTriageParams, ToolResult> {
    return new DeepResearchTriageInvocation(params);
  }
}
