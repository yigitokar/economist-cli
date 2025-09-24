# Economist CLI

[![License](https://img.shields.io/github/license/yigitokar/economist-cli)](https://github.com/yigitokar/economist-cli/blob/main/LICENSE)

![Economist CLI Screenshot](./docs/assets/economist-screenshot.png)

Economist CLI is a command-line agent that pairs top-tier coding ability with tooling designed for economic research. Ask it to refactor a codebase, run quantitative experiments, or dig through literature — all without leaving your terminal.

## Highlights
- **Top-level coder**: Generates and edits complex projects, explains architecture, and automates repetitive engineering work.
- **Economics-native toolkit**: Optimized prompts, data helpers, and workflow presets built around economic modeling, policy analysis, and reproducible research.
- **Proof Helper**: Formal reasoning assistant for walkthroughs, counterexamples, and publication-ready argument drafts.
- **Deep Research**: Built-in long-form investigation mode that synthesizes multi-source findings using OpenAI advanced models when available.
- **Grounded answers**: On-demand web search, Google grounding, and dataset fetch commands keep responses aligned with current information.
- **MCP friendly**: Works seamlessly with Model Context Protocol servers so you can extend the CLI with your own tools and data connectors.

## Use Cases
- Brainstorm research ideas and sketch experimental designs.
- Translate academic papers into executable simulations or dashboards.
- Automate data cleaning, regression pipelines, and report generation.
- Draft policy memos, blog posts, and investor updates directly from analysis outputs.
- Coordinate long-running projects with saved sessions and reproducible notebooks.

## Install
**Requirements:** Node.js 20+ on macOS, Linux, or Windows.

Choose the flow that fits your setup:

```bash
# Try immediately
npx @careresearch/econ-agent

# Install globally
npm install -g @careresearch/econ-agent

# Local clone (contribute or customize)
git clone https://github.com/yigitokar/economist-cli
cd economist-cli
npm install && npm run build
```

### Zero-config by default
- No local `.env` is required for npm installs. The CLI uses built-in defaults and calls provider APIs via Supabase Edge Function proxies.
- When you run `economist`, the CLI links your device, mints a token, and authenticates to the proxies using `X-CLI-Token`.
- Your provider keys (OpenAI / Gemini) live server-side in Supabase and never on the client.

## Initial Setup
1. **Launch the CLI (device-link):** Run `economist`. The CLI will display a short code and open your browser to `/sign-up`. Sign in with Google (via Supabase Auth). In production, you’ll be routed through Stripe Checkout. When onboarding completes, the web app calls finalize‑link to mint a CLI token and the CLI signs you in automatically.
2. **Dev/test FREE_MODE (optional):** In development, Stripe is skipped and `/sign-up` calls finalize‑link directly. You can manage auth from within the CLI: `/login` to re‑run device‑link, `/whoami` to check status, and `/sign‑out` to clear the local token.
3. **Optional BYOK:** If you prefer to use your own provider keys locally, set `OPENAI_API_KEY` (for Deep Research) and/or `GEMINI_API_KEY` (for direct Gemini usage). Otherwise, the CLI will use the Supabase proxies with server‑side keys.
4. **Project context (optional):** Drop an `ECON.md` or `.economist/context.md` file in your repo to preload research goals, datasets, or style guidance.

Optional BYOK `.env` snippet:

```dotenv
GEMINI_API_KEY=your-gemini-key   # Optional; if omitted, Gemini calls use the Supabase proxy
OPENAI_API_KEY=your-openai-key   # Optional; if omitted, Deep Research uses the Supabase proxy
GOOGLE_API_KEY=your-grounding-key # Optional for Vertex/grounding use cases
```

## Quick Start
```bash
# Open an interactive workspace in the current project
economist

# Include extra folders when building context
economist --include-directories ../data --include-directories ../models

# Run a one-off prompt without entering the UI
economist --prompt "Design a DSGE calibration workflow for the attached data"

# Manage installed MCP servers
economist mcp list
```

Inside the interactive session, open the command palette (`Cmd/Ctrl + K`) to launch Proof Helper, Deep Research, and other specialist tools.

Use `economist --help` at any time to explore available commands and flags.

## Next Steps
- Read the docs in `docs/` for advanced configuration and MCP integrations.
- File feedback or feature requests via [GitHub Issues](https://github.com/yigitokar/economist-cli/issues).
- Licensed under [Apache-2.0](https://github.com/yigitokar/economist-cli/blob/main/LICENSE).
