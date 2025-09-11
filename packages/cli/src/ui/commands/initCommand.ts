/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  CommandContext,
  SlashCommand,
  SlashCommandActionReturn,
} from './types.js';
import { CommandKind } from './types.js';

export const initCommand: SlashCommand = {
  name: 'init',
  description:
    'Starts economist triage and prepares a tailored ECON.md file.',
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
    const econMdPath = path.join(targetDir, 'ECON.md');

    if (fs.existsSync(econMdPath)) {
      context.ui.addItem(
        {
          type: 'info',
          text: 'Found existing ECON.md. Not overwriting. Entering triage mode…',
        },
        Date.now(),
      );
    } else {
      // Create an empty ECON.md file (content to be written after triage)
      fs.writeFileSync(econMdPath, '', 'utf8');
      context.ui.addItem(
        {
          type: 'info',
          text: 'Created ECON.md. Entering triage mode to tailor it to your project…',
        },
        Date.now(),
      );
    }

    return {
      type: 'submit_prompt',
      content: `
You are the economist triage and planning agent for a terminal-based workflow.
Your immediate goal is to run a focused triage interview (5 crisp questions),
then propose an effective analysis plan, and finally prepare a tailored ECON.md
at the path:

  ${econMdPath}

Triage first — do NOT write the file yet. Ask the user the questions below in a
succinct, one-screen message, and wait for answers:

1) What are you aiming to achieve?
   Examples: forecast sales, estimate treatment effects, test a hypothesis, explore correlations, build an economic model

2) What data do you have (or need)?
   Format (CSV/Excel/API/none yet), rough size, and whether it's time series/panel/cross-sectional

3) What methods/tools do you prefer?
   R/Python/Stata/Julia, or specific approaches like IV/DiD/ML - say "no preference" for recommendations

4) What outputs do you need?
   Statistical tables, visualizations, LaTeX paper, dashboard, or just exploratory results

5) Any critical constraints or requirements?
   Must replicate existing results, regulatory standards, computational limits, etc.

Guidance for your subsequent plan:
- Act as an experienced senior economist who stays current with methodological advances.
- Present multiple appropriate options to the user in a collaborative way: "Based on your goals, we could do X, Y, or Z. What do you think?"
- Your suggestions should reflect modern best practices while being pragmatic:

  When suggesting methods, consider:
  - The specific research question and what it demands
  - Data structure and quality constraints  
  - Publication standards in the relevant field
  - Computational and time constraints
  - The user's familiarity with different approaches

  For example:
  - For DiD with staggered treatment: Mention that traditional TWFE has known issues with heterogeneous effects, and suggest alternatives like Callaway-Sant'Anna or Sun-Abraham, but explain the tradeoffs (interpretability, computational cost, assumptions)
  - For IV: Suggest both 2SLS and newer weak-instrument robust methods, explaining when each is most appropriate
  - For RDD: Recommend modern bandwidth selection and bias correction, but note when simpler approaches might suffice
  - For forecasting: Balance between interpretable models (ARIMA) and potentially more accurate ML methods based on the use case

- Frame recommendations as a discussion:
  "Given your goal of [X], I'd suggest considering:
   1. [Method A] - good for [reason], though requires [assumption/data]
   2. [Method B] - more robust to [issue], but more complex to implement
   3. [Method C] - simpler approach that might be sufficient if [condition]
   What fits best with your needs?"

- Be aware of the latest methods but recommend them only when they add real value:
  - Sometimes a simple OLS with robust SEs is perfectly appropriate
  - Not every DiD needs the newest estimator if treatment is simple
  - Classical methods can be preferable when transparency is crucial

- Match sophistication to the user's stated objectives:
  - Quick exploration: simpler, faster methods
  - Publication: methods that meet journal standards in that field
  - Policy work: emphasis on robustness and sensitivity analysis

- Always explain your reasoning briefly so the user understands the tradeoffs.

After you receive answers, do the following in a single follow-up message:
1) Present a concise plan (bulleted steps) mapping goals → data/estimands → methods.
2) List recommended estimators/diagnostics with brief, non-prescriptive rationale.
3) Outline outputs to produce (tables/figures/memo/LaTeX/CSV) and their filenames.
4) Then write ECON.md using the write_file tool with file_path "${econMdPath}".

ECON.md should be well-structured Markdown with sections like:
- Project Summary
- Analysis Goals (based on Q1: what they aim to achieve)
- Data Overview (based on Q2: format, size, structure)
- Methods & Tools (based on Q3: preferred approaches and software)
- Expected Outputs (based on Q4: deliverables and formats)
- Constraints & Requirements (based on Q5: critical limitations)
- Proposed Analysis Plan (stepwise, actionable)
- Next Steps & Open Questions

Important:
- Keep the triage questions crisp and on a single screen.
- Only after user answers, call write_file once to create/update ECON.md at the
  absolute path above. Use clear, publishable Markdown.

After ECON.md is written, optionally offer Python project bootstrap:

- If the project directory is effectively empty and the user prefers Python (or agrees), offer to initialize a modern Python project with uv (pyproject.toml). Proceed only on explicit consent.
- Let the agent handle uv detection and PATH gracefully (try \`uv\` on PATH, try \`~/.local/bin/uv\`, check Homebrew paths). If uv isn’t available, offer to install it and, if found outside PATH, either use that path for this session or offer to update PATH. Do not install or modify PATH without consent. On Windows, note a new terminal may be required after install.
- Use a non-interactive uv init that avoids overwriting existing files (e.g., \`uv init --no-readme\`). If the directory isn’t empty or the user declines, do nothing further.
`,
    };
  },
};
