# Auth onboarding & zero‑config CLI (v0.2.4)

## Summary
This PR delivers a zero‑config onboarding experience and improved web UX:
- CLI and Core embed Supabase anon defaults for the project so new users don’t need any env vars to link their device.
- Device‑link flow sends required `apikey` and `Authorization` headers to Supabase Edge Functions.
- Web app: polished sign-up and success pages, added sign-out, and redirect to `/success` after linking/sign-in.
- Published versions: `@careresearch/econ-core@0.2.4`, `@careresearch/econ-agent@0.2.4`.

## Changes
### Web (Next.js) — `packages/web`
- `app/sign-up/page.tsx`
  - Finalize device link and redirect to `/success?code=...`.
  - Persist device code across Google OAuth roundtrip via `sessionStorage`.
  - If user is authenticated but lacks a device code, redirect to `/success` instead of showing an error box.
  - Added a visible “Sign out” button for already signed-in state (and error state).
- `app/success/page.tsx`
  - Redesigned success screen with guidance, CLI install command (copy button), and a “Sign out” button.
- `app/page.tsx`
  - Removed homepage “Sign in” CTA (kept “Sign up”).
- `components/ui/button.tsx`
  - Ensure `className` overrides apply after variant classes (styling fix).

### CLI — `packages/cli`
- `src/services/proOnboarding.ts`
  - Embed `DEFAULT_SUPABASE_URL` and `DEFAULT_SUPABASE_ANON_KEY`; always include anon headers.
- `src/ui/commands/loginCommand.ts`
  - Zero‑config defaults; no env required for `/login`.

### Core — `packages/core`
- `src/tools/deep-literature-review.ts`, `src/tools/proof-helper.ts`
  - Supabase proxy requests fall back to embedded anon/URL when env vars are missing.

### Versions
- `@careresearch/econ-core` → `0.2.4`
- `@careresearch/econ-agent` depends on `^0.2.4`

## Testing
### CLI
- `npm i -g @careresearch/econ-agent@latest`
- `economist /login` → browser opens `/sign-up` → Google → `/success` → CLI links and saves token.
- `economist /whoami` should show status.
- Deep Research and Proof Helper GPT‑5 path route via `openai-proxy` without local `OPENAI_API_KEY`.

### Web (dev)
- `npm run dev -w packages/web`
- `/sign-up` with device code: finalizes link and redirects to `/success`.
- Homepage → Sign up → Google: if authenticated without a code, lands on `/success` (welcome/install guidance).

## Deploy (Vercel)
- Project root: `packages/web`
- Node: 20.x
- Env vars:
  - `NEXT_PUBLIC_SUPABASE_URL = https://giefigqpffbszyozgzkk.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon>`
- Supabase Auth redirect URLs (Dashboard → Auth → URL Configuration):
  - `https://YOUR_DOMAIN/sign-up`
  - `https://YOUR_DOMAIN/success`
- Edge Functions secrets (service-side):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL=https://YOUR_DOMAIN`

## Security
- Anon keys are public by design; RLS and Edge Functions guard sensitive paths. Service role key remains server-side only.
- CLI token persisted locally under `~/.economist/session.json` (or overridden by `ECONOMIST_CLI_TOKEN`).

## Checklist
- [x] Zero‑config onboarding in CLI/Core
- [x] Web sign-out button on sign-up and success
- [x] Redirect to `/success` post‑finalize or post‑auth
- [x] CLI/Core version bumps (0.2.4) and publish
- [x] README reflects zero‑config and device‑link flow
