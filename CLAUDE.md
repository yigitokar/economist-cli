# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Economist CLI**, a fork of the Gemini CLI tailored for economic research workflows. It's an open-source AI agent that brings the power of Gemini and OpenAI directly into your terminal, with specialized tools for economists.

**Main branch:** `main`
**Binary name:** `economist` (not `gemini`)
**Package name:** `@careresearch/econ-cli`

## Essential Commands

### Development & Build Commands

```bash
# Full validation (build, test, typecheck, lint) - Run before submitting changes
npm run preflight

# Build the entire project
npm run build

# Run tests
npm run test                    # Run all tests
npm run test:ci                 # Run tests with coverage
npm run test:e2e                # Run end-to-end tests
npm run test:integration:all    # Run all integration tests

# Run a single test file (from package directory)
cd packages/cli && npx vitest run src/path/to/test.test.ts

# Type checking
npm run typecheck

# Linting
npm run lint        # Check for lint errors
npm run lint:fix    # Auto-fix lint errors
npm run lint:ci     # CI-level lint check (fails on warnings)

# Code formatting
npm run format      # Format all code with Prettier

# Start the CLI locally
npm run start       # Start economist CLI from root
npm run build-and-start  # Build then start economist CLI

# Debug mode
npm run debug       # Start economist CLI with Node inspector
```

### Package-Specific Commands

The project uses npm workspaces. To run commands in specific packages:

```bash
# Run command in specific package (note: internal packages still use @google namespace)
npm run <command> --workspace @google/gemini-cli
npm run <command> --workspace @google/gemini-cli-core
npm run <command> --workspace @google/gemini-cli-a2a-server
```

## High-Level Architecture

### Monorepo Structure

```
packages/
├── cli/          # React/Ink terminal UI, user interaction layer
├── core/         # Core logic, AI client, tool system, services
├── a2a-server/   # Agent-to-Agent communication server
├── vscode-ide-companion/  # VSCode extension for IDE integration
└── test-utils/   # Shared testing utilities
```

### Key Architectural Patterns

1. **Layered Architecture**
   - UI Layer: React/Ink components (`packages/cli/src/ui/`)
   - Application Layer: CLI commands and interaction handling
   - Core Layer: Business logic, AI integration (`packages/core/src/`)
   - Infrastructure: File system, Git, telemetry services

2. **Dependency Injection via Config**
   - Central `Config` class manages all configuration and service dependencies
   - Settings cascade: Global → Workspace → Local → Runtime
   - Located in `packages/core/src/config/`

3. **Tool System Architecture**
   - Declarative tool definitions with strong typing
   - Built-in tools: file operations, shell, web search, Git
   - Dynamic tool discovery via MCP (Model Context Protocol)
   - Tool registry in `packages/core/src/tools/`

4. **AI Integration (Multi-Provider)**
   - **Gemini**: Multiple auth methods (OAuth, API keys, Vertex AI), conversation history management
   - **OpenAI**: Integrated for specialized features like Deep Research and Proof Helper
   - Flash model fallback for quota management
   - Located in `packages/core/src/services/gemini-client.ts`

5. **UI Architecture (React/Ink)**
   - Context providers for state management (Vim mode, streaming, stats)
   - Static component for chat history, dynamic for input
   - Custom hooks for complex logic
   - Main app in `packages/cli/src/ui/App.tsx`

6. **IDE Integration**
   - VSCode extension provides diff preview/approval UI
   - MCP protocol for IDE communication
   - Active file context sharing
   - IDE client in `packages/core/src/ide-client/`

### Critical Files & Entry Points

- **Main Entry**: `packages/cli/src/index.ts`
- **Config System**: `packages/core/src/config/Config.ts`
- **Tool Registry**: `packages/core/src/tools/tool-registry.ts`
- **AI Client**: `packages/core/src/services/gemini-client.ts`
- **UI App**: `packages/cli/src/ui/App.tsx`
- **Settings**: `packages/core/src/settings/`

## Testing Conventions

The project uses **Vitest** as the testing framework. Key patterns:

### Test Structure
- Test files co-located with source: `*.test.ts` or `*.test.tsx`
- Use `describe`, `it`, `expect` from Vitest
- Setup/teardown with `beforeEach`/`afterEach`

### Mocking Patterns
```typescript
// Mock ES modules at top of file
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, homedir: vi.fn() };
});

// Use vi.hoisted for early mock definitions
const myMock = vi.hoisted(() => vi.fn());
```

### Common Mocks
- Node built-ins: `fs`, `fs/promises`, `os`, `path`, `child_process`
- External SDKs: `@google/genai`, `@modelcontextprotocol/sdk`
- Internal modules between packages

### React/Ink Testing
- Use `render()` from `ink-testing-library`
- Assert with `lastFrame()`
- Mock hooks and complex components

## Code Style Guidelines

### TypeScript Best Practices
- **Prefer plain objects over classes** with TypeScript interfaces
- **Use ES modules** for encapsulation (import/export)
- **Avoid `any` types**, prefer `unknown` when type is uncertain
- **Use type narrowing** in switch statements with `checkExhaustive` helper
- **Embrace array operators**: `.map()`, `.filter()`, `.reduce()` for immutability

### React Guidelines
- **Use functional components with Hooks** (no class components)
- **Keep components pure** - no side effects during rendering
- **Respect one-way data flow** - pass data down via props
- **Never mutate state directly** - use immutable updates
- **Avoid unnecessary `useEffect`** - prefer event handlers
- **Follow Rules of Hooks** - top-level, unconditional calls
- **Small, composable components** - break down complex UIs

### General Style
- Use **hyphens in flag names** (e.g., `--my-flag` not `--my_flag`)
- Write **minimal, high-value comments** only when necessary
- Follow existing patterns in neighboring files
- Check existing dependencies before adding new ones

## Economist-Specific Features

The Economist CLI includes specialized features for economic research:

- **Economics-native toolkit**: Optimized prompts, data helpers, and workflow presets
- **Proof Helper**: Formal reasoning assistant for economic arguments and proofs
- **Deep Research**: Long-form investigation mode using OpenAI models
- **Research context**: Support for `ECON.md` or `.economist/context.md` files for project context
- **Data workflow integration**: Built-in support for economic modeling and policy analysis

## Important Context from GEMINI.md

The repository contains extensive documentation in `GEMINI.md` that includes:
- Detailed testing conventions with Vitest
- React best practices and performance guidelines
- JavaScript/TypeScript style preferences
- Git workflow conventions

Always prefer editing existing files over creating new ones, and never proactively create documentation files unless explicitly requested.

## Security Considerations

- **Multi-layer approval system** for dangerous operations
- **Workspace-based trust boundaries**
- **Optional sandboxing** with Docker/Podman for shell commands
- **Path validation** to prevent access outside workspace
- Never commit secrets or API keys
- Always follow security best practices in generated code