/**
 * Guarded prepare script to avoid running CLI bundling during Vercel web builds.
 * On local/dev/publish, it runs the normal "bundle" script. On Vercel (VERCEL=1),
 * it exits early so monorepo install doesn’t fail when building only packages/web.
 */

import { execSync } from 'node:child_process';

try {
  if (process.env.VERCEL) {
    console.log('[prepare] Detected Vercel environment – skipping bundle.');
    process.exit(0);
  }
  console.log('[prepare] Running bundle...');
  execSync('npm run bundle', { stdio: 'inherit' });
} catch (err) {
  console.error('[prepare] Error running bundle:', err?.message || err);
  process.exit(1);
}
