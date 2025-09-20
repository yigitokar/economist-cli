/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
import type { Config } from '../config/config.js';
import { ToolErrorType } from './tool-error.js';

export interface DeepResearchPromptConstructorParams {
  research_objective: string;
  query?: string;
  coverage_requirements?: string;
  evidence_expectations?: string;
  source_preferences?: {
    prioritize?: string[];
    avoid?: string[];
    notes?: string;
  };
  deliverables?: string;
  timeline?: string;
  additional_context?: string;
  metadata?: Record<string, string>;
}

interface StoredPromptPayload {
  research_objective: string;
  query: string;
  coverage_requirements?: string;
  evidence_expectations?: string;
  source_preferences?: {
    prioritize?: string[];
    avoid?: string[];
    notes?: string;
  };
  deliverables?: string;
  timeline?: string;
  additional_context?: string;
  metadata?: Record<string, string>;
  created_at: string;
  instructions: string;
}

class DeepResearchPromptConstructorInvocation extends BaseToolInvocation<
  DeepResearchPromptConstructorParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: DeepResearchPromptConstructorParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return 'Store deep research triage notes and produce reusable instructions.';
  }

  private formatBullet(label: string, value?: string | null): string {
    if (!value || !value.trim()) return '';
    return `- ${label}: ${value.trim()}`;
  }

  private buildInstructions(payload: StoredPromptPayload): string {
    const sections: string[] = [];
    sections.push(
      'You are my research analyst. Produce a deeply sourced literature review that speaks in the first person ("I") from my perspective and follows the brief below. Whenever comparisons or multi-factor summaries help, include tables with clear headers. Cite every factual statement with inline references and provide full source metadata.',
    );
    sections.push('# Deep Literature Review Brief');
    sections.push(`## Research Objective\n${payload.research_objective.trim()}`);

    if (payload.coverage_requirements?.trim()) {
      sections.push(`## Coverage Requirements\n${payload.coverage_requirements.trim()}`);
    } else {
      sections.push(
        `## Coverage Requirements\nNo specific dimensions provided. Treat geography, time horizon, sectors, and deal archetypes as open-ended. Surface any patterns that meaningfully affect the findings and call them out so I can decide whether to narrow focus.`,
      );
    }
    if (payload.evidence_expectations?.trim()) {
      sections.push(`## Evidence Expectations\n${payload.evidence_expectations.trim()}`);
    } else {
      sections.push(
        `## Evidence Expectations\nBalance authoritative summaries with concrete examples. Distinguish clearly between causal evidence, descriptive benchmarks, and practitioner-oriented guidance. Flag critical gaps that would benefit from bespoke analysis.`,
      );
    }

    const sourceLines: string[] = [];
    if (payload.source_preferences?.prioritize?.length) {
      sourceLines.push(`Prioritize: ${payload.source_preferences.prioritize.join(', ')}`);
    }
    if (payload.source_preferences?.avoid?.length) {
      sourceLines.push(`Avoid: ${payload.source_preferences.avoid.join(', ')}`);
    }
    if (payload.source_preferences?.notes?.trim()) {
      sourceLines.push(payload.source_preferences.notes.trim());
    }
    if (sourceLines.length > 0) {
      sections.push(`## Source Preferences\n${sourceLines.join('\n')}`);
    } else {
      sections.push(
        `## Source Preferences\nUse current, credible sources (peer-reviewed journals, regulators, top consultancies, industry databases). Link directly to primary materials and avoid low-quality aggregators. Provide full metadata for every citation.`,
      );
    }

    const deliverableLines: string[] = [];
    if (payload.deliverables?.trim()) {
      deliverableLines.push(payload.deliverables.trim());
    }
    if (payload.timeline?.trim()) {
      deliverableLines.push(`Timeline: ${payload.timeline.trim()}`);
    }
    if (deliverableLines.length > 0) {
      sections.push(`## Deliverables & Timeline\n${deliverableLines.join('\n')}`);
    } else {
      sections.push(
        `## Deliverables & Timeline\nDeliver a concise report with executive summary, thematic sections, tables (where useful), limitations, and recommended next steps. No explicit deadline stated; optimize for thoroughness and note if additional time would materially improve coverage.`,
      );
    }

    if (payload.additional_context?.trim()) {
      sections.push(`## Additional Context\n${payload.additional_context.trim()}`);
    }

    sections.push(`## Execution Guidelines
- Provide inline citations for every substantive claim and compile a reference list with full metadata.
- Highlight conflicting findings, methodological caveats, and implementation considerations that matter for my objective.
- Where informative, include comparative tables (e.g., model assumptions, inputs, outputs, use cases).
- Close with key open questions, suggested follow-up analyses, and any critical datasets to acquire.`);

    return sections.join('\n\n');
  }

  private buildDisplaySummary(
    payload: StoredPromptPayload,
    relativeNotesPath: string,
    relativeInstructionsPath: string,
    recommendedQuery: string,
  ): string {
    const lines: string[] = ['**Deep Research Triage Saved**'];
    lines.push(this.formatBullet('Objective', payload.research_objective));
    lines.push(this.formatBullet('Recommended query', recommendedQuery));
    if (payload.deliverables) {
      lines.push(this.formatBullet('Deliverables', payload.deliverables));
    }
    if (payload.timeline) {
      lines.push(this.formatBullet('Timeline', payload.timeline));
    }
    lines.push(this.formatBullet('Notes file', relativeNotesPath));
    lines.push(this.formatBullet('Instructions', relativeInstructionsPath));
    return lines.filter(Boolean).join('\n');
  }

  private buildLlmlContent(
    relativeNotesPath: string,
    relativeInstructionsPath: string,
    callTemplate: { query: string; instructions: string; metadata?: Record<string, string> | undefined },
  ): string {
    const summaryLines = [
      'Deep research triage notes stored.',
      `Notes path: ${relativeNotesPath}`,
      `Instructions path: ${relativeInstructionsPath}`,
      'Use the object below when calling `deep_literature_review` (append any additional parameters you need):',
      '```json',
      JSON.stringify(callTemplate, null, 2),
      '```',
    ];
    return summaryLines.join('\n');
  }

  async execute(): Promise<ToolResult> {
    const projectRoot = this.config.getProjectRoot();
    try {
      const pathModule = await import('node:path');
      const fs = await import('node:fs/promises');

      const triageRoot = pathModule.join(projectRoot, '.econ', 'deep-lit-triage');
      await fs.mkdir(triageRoot, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const entryDir = pathModule.join(triageRoot, timestamp);
      await fs.mkdir(entryDir, { recursive: true });

      const query = (this.params.query ?? this.params.research_objective).trim();
      const payload: StoredPromptPayload = {
        research_objective: this.params.research_objective.trim(),
        query,
        coverage_requirements: this.params.coverage_requirements?.trim() || undefined,
        evidence_expectations: this.params.evidence_expectations?.trim() || undefined,
        source_preferences: this.params.source_preferences,
        deliverables: this.params.deliverables?.trim() || undefined,
        timeline: this.params.timeline?.trim() || undefined,
        additional_context: this.params.additional_context?.trim() || undefined,
        metadata: this.params.metadata,
        created_at: new Date().toISOString(),
        instructions: '',
      };

      const instructions = this.buildInstructions(payload);
      payload.instructions = instructions;

      const notesPath = pathModule.join(entryDir, 'notes.json');
      const instructionsPath = pathModule.join(entryDir, 'instructions.md');

      await fs.writeFile(notesPath, JSON.stringify(payload, null, 2));
      await fs.writeFile(instructionsPath, instructions, 'utf-8');

      const latestPath = pathModule.join(triageRoot, 'latest.json');
      const latestPayload = {
        last_saved_at: payload.created_at,
        notes_path: notesPath,
        instructions_path: instructionsPath,
        query,
        research_objective: payload.research_objective,
        deliverables: payload.deliverables ?? null,
        timeline: payload.timeline ?? null,
        coverage_requirements: payload.coverage_requirements ?? null,
        evidence_expectations: payload.evidence_expectations ?? null,
        source_preferences: payload.source_preferences ?? null,
        additional_context: payload.additional_context ?? null,
        metadata: payload.metadata ?? null,
      };
      await fs.writeFile(latestPath, JSON.stringify(latestPayload, null, 2));

      const relativeNotesPath = pathModule.relative(projectRoot, notesPath);
      const relativeInstructionsPath = pathModule.relative(projectRoot, instructionsPath);

      const callTemplate = {
        query,
        instructions,
        ...(payload.metadata ? { metadata: payload.metadata } : {}),
      };

      return {
        llmContent: this.buildLlmlContent(
          relativeNotesPath,
          relativeInstructionsPath,
          callTemplate,
        ),
        returnDisplay: this.buildDisplaySummary(
          payload,
          relativeNotesPath,
          relativeInstructionsPath,
          query,
        ),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        llmContent: `Error constructing deep research prompt: ${message}`,
        returnDisplay: message,
        error: { message, type: ToolErrorType.EXECUTION_FAILED },
      };
    }
  }
}

export class DeepResearchPromptConstructorTool extends BaseDeclarativeTool<
  DeepResearchPromptConstructorParams,
  ToolResult
> {
  static readonly Name = 'deep_research_prompt_constructor';

  constructor(private readonly config: Config) {
    super(
      DeepResearchPromptConstructorTool.Name,
      'DeepResearchPromptConstructor',
      'Persists structured triage notes and returns reusable instructions for deep literature review runs.',
      Kind.Think,
      {
        type: 'object',
        properties: {
          research_objective: {
            type: 'string',
            description: 'Concise statement of what the deep research should deliver.',
          },
          query: {
            type: 'string',
            description:
              'Optional explicit query string to pass as the input when invoking deep_literature_review. Defaults to research_objective.',
          },
          coverage_requirements: {
            type: 'string',
            description:
              'Dimensions that must be covered (geographies, cohorts, timelines, sub-topics).',
          },
          evidence_expectations: {
            type: 'string',
            description:
              'Metrics, study designs, or benchmark papers that should anchor the synthesis.',
          },
          source_preferences: {
            type: 'object',
            properties: {
              prioritize: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific sources or repositories to prioritize.',
              },
              avoid: {
                type: 'array',
                items: { type: 'string' },
                description: 'Sources that should be excluded.',
              },
              notes: {
                type: 'string',
                description: 'Additional narrative on source handling.',
              },
            },
            additionalProperties: false,
          },
          deliverables: {
            type: 'string',
            description:
              'Required outputs (e.g., policy brief, comparative table, spotlight on quantitative results).',
          },
          timeline: {
            type: 'string',
            description: 'Deadlines or staging expectations.',
          },
          additional_context: {
            type: 'string',
            description: 'Other constraints, stakeholders, or reminders relevant to the run.',
          },
          metadata: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Optional metadata map to attach when invoking deep_literature_review.',
          },
        },
        required: ['research_objective'],
        additionalProperties: false,
      },
    );
  }

  protected override validateToolParamValues(
    params: DeepResearchPromptConstructorParams,
  ): string | null {
    if (params.research_objective.trim() === '') {
      return '`research_objective` cannot be blank.';
    }
    if (params.query !== undefined && params.query.trim() === '') {
      return 'If provided, `query` cannot be blank.';
    }
    if (params.source_preferences) {
      const prefs = params.source_preferences;
      if (
        prefs.prioritize !== undefined &&
        (!Array.isArray(prefs.prioritize) ||
          prefs.prioritize.some((item) => typeof item !== 'string'))
      ) {
        return '`source_preferences.prioritize` must be an array of strings.';
      }
      if (
        prefs.avoid !== undefined &&
        (!Array.isArray(prefs.avoid) ||
          prefs.avoid.some((item) => typeof item !== 'string'))
      ) {
        return '`source_preferences.avoid` must be an array of strings.';
      }
    }
    return null;
  }

  protected createInvocation(
    params: DeepResearchPromptConstructorParams,
  ): ToolInvocation<DeepResearchPromptConstructorParams, ToolResult> {
    return new DeepResearchPromptConstructorInvocation(this.config, params);
  }
}
