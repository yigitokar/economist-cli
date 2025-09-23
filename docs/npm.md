# Package Overview

This monorepo contains two main packages: `@careresearch/econ-agent` (CLI) and `@careresearch/econ-core` (Core library).

## `@careresearch/econ-agent`

This is the main package for the Economist CLI (“EconAgent”). It is responsible for the user interface, command parsing, onboarding (device-link), and all other user-facing functionality.

When this package is published, it exposes a `bin` named `economist`. Users can run the CLI via `npx @careresearch/econ-agent` or install globally with `npm install -g @careresearch/econ-agent` and then run `economist`.

## `@careresearch/econ-core`

This package contains the core engine: economics-native tools, model client integrations, and shared services. It is published as a standard Node.js library with its own dependencies (compiled JS under `dist/`). The CLI depends on this package.

## NPM Workspaces

This project uses [NPM Workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) to manage the packages within this monorepo. This simplifies development by allowing us to manage dependencies and run scripts across multiple packages from the root of the project.

### How it Works

The root `package.json` file defines the workspaces for this project:

```json
{
  "workspaces": ["packages/*"]
}
```

This tells NPM that any folder inside the `packages` directory is a separate package that should be managed as part of the workspace.

### Benefits of Workspaces

- **Simplified Dependency Management**: Running `npm install` from the root of the project will install all dependencies for all packages in the workspace and link them together. This means you don't need to run `npm install` in each package's directory.
- **Automatic Linking**: Packages within the workspace can depend on each other. When you run `npm install`, NPM will automatically create symlinks between the packages. This means that when you make changes to one package, the changes are immediately available to other packages that depend on it.
- **Simplified Script Execution**: You can run scripts in any package from the root of the project using the `--workspace` flag. For example, to run the `build` script in the CLI package, you can run `npm run build --workspace @careresearch/econ-agent` or `npm run build -w packages/cli`.
