# Packages: Publish Plan (Core + CLI)

This document covers how to ship the Economist CLI publicly so users can install and run it with a single command, while keeping the codebase clean for ongoing development.

## Goals
- Publish a single, user-facing CLI: `economist`
- Enable installs via:
  - `npx @careresearch/econ-agent`
  - `npm install -g @careresearch/econ-agent` then `economist`
- Keep the engine (core) reusable and versioned separately
- Preserve auth gating (device-link → Google → Stripe → finalize-link) with FREE_MODE for dev/test

## Current repo observations
- `packages/cli/package.json`
  - name: `@google/gemini-cli`
  - bin: `{ "gemini": "dist/index.js" }`
  - engines: `node >=20`
- `packages/core/package.json`
  - name: `@google/gemini-cli-core`
  - engines: `node >=20`
- README should say Node 20+; web workspace builds on Node 22 LTS.

## Decision checklist
- [ ] Package names and scope
  - CLI → `@careresearch/econ-agent` (bin: `economist`)
  - Core → `@careresearch/econ-core`
- [ ] Node version support
  - Target Node >=20 (LTS baseline). Update README accordingly.
- [ ] Packaging strategy
  - Recommended: publish both Core and CLI to npm; CLI depends on Core by version.
  - Alternate: bundle Core into CLI to publish only one package.
- [ ] CI release automation (Changesets or semantic-release)

## Required changes (before first publish)
1) Rename packages
   - `packages/core/package.json`
     - `name`: `@careresearch/econ-core`
     - Ensure `version`, `repository` point to our GitHub
   - `packages/cli/package.json`
     - `name`: `@careresearch/econ-agent`
     - `bin`: `{ "economist": "dist/index.js" }`
     - Update dependency on Core to `@careresearch/econ-core: ^X.Y.Z`
2) Align Node engines
   - Choose `"engines": { "node": ">=20" }` consistently in both Core and CLI
   - Keep README consistent
3) Ensure publishable artifacts
   - `files: ["dist"]`
   - Add `"prepublishOnly": "npm run build"`
   - Verify build outputs JS to `dist/`
4) Make packages public by default
   - Add `"publishConfig": { "access": "public" }`
5) Replace local `file:../core` in CLI with the published core dependency (after core is published)
6) Update `repository` fields to current GitHub URL

## Manual publish (first release)
1) Login once
```bash
npm login
```
2) Publish Core first
```bash
# From repo root
npm run build -w packages/core
npm pack -w packages/core      # optional: inspect .tgz contents
npm publish --access public -w packages/core
```
3) Publish CLI
```bash
npm run build -w packages/cli
# Update CLI's package.json to depend on the just-published core version if needed
npm pack -w packages/cli       # optional: inspect .tgz contents
npm publish --access public -w packages/cli
```
4) Verify
```bash
npx @careresearch/econ-agent
npm i -g @careresearch/econ-agent && economist --help
```

## CI-driven publish (recommended)
- Use Changesets across workspaces:
  - `pnpm dlx changesets init` (or `npx changesets init`)
  - On PRs, create changesets to bump versions by semver
  - GitHub Action publishes on tag or on main merges
- GitHub Action (high-level):
  - Node setup, install, build
  - `changesets/action` to version + publish to npm with `NPM_TOKEN`
  - Matrix can be over workspaces; only changed packages publish

## Updates and versioning
- SemVer:
  - patch: fixes
  - minor: new features (backwards compatible)
  - major: breaking changes
- Core changes:
  - Publish new `@careresearch/econ-core` first
  - If CLI consumes new Core APIs, bump CLI dependency and publish CLI
- Reaching users:
  - `npx` users get latest on each run
  - Global users: prompt via `update-notifier` to run `npm i -g @careresearch/econ-agent`

## Pre-releases and canaries
```bash
# Publish a pre-release to "next" tag
npm publish --tag next -w packages/core
npm publish --tag next -w packages/cli
# Users can try:
npx @careresearch/econ-agent@next
```

## Rollback strategy
- `npm deprecate @careresearch/econ-agent@x.y.z "Reason..."`
- Publish a patched version quickly (x.y.z+1)
- If needed, move `latest` dist-tag back to a stable version

## Auth and gating (unchanged by publish)
- First run triggers device-link flow:
  1) CLI shows a code and opens the browser to `/sign-up`
  2) Web: Supabase Auth (Google); in prod, Stripe Checkout
  3) Web calls `finalize-link` (Supabase Edge Function) to mint CLI token
  4) CLI polls and consumes token; Pro features unlocked
- FREE_MODE for dev/test: bypass Stripe and finalize directly
- Optional: enforce minimum CLI version in Edge Functions and return a friendly upgrade message

## Optional distribution paths
- Homebrew: formula that wraps `npm i -g @careresearch/econ-agent`
- Curl installer: `curl | bash` that installs Node (if missing) and runs npm global install
- Single-binary packs (pkg/nexe): not necessary now; trade-offs in size and updates

## Checklist to ship v0.1
- [ ] Decide Node version target (20+) and align README + engines
- [ ] Rename packages (Core + CLI) and update CLI bin → `economist`
- [ ] Set publishConfig access → public and add prepublishOnly builds
- [ ] Publish Core, then publish CLI
- [ ] Verify `npx` and global installs
- [ ] Wire update-notifier and friendly upgrade hint
- [ ] (Optional) Add Changesets + GitHub Action for automated releases
