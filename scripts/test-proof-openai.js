/**
 * Simple smoke test to verify the proof-helper tool can reach OpenAI.
 *
 * Usage:
 *   PROOF_HELPER_MODEL=openai:gpt-4o-mini OPENAI_API_KEY=sk-... node scripts/test-proof-openai.js
 * Optional:
 *   OPENAI_BASE_URL=https://api.openai.com/v1 (or your proxy)
 *   GPT5_REASONING_EFFORT=low|medium|high (if using gpt-5 models)
 */

import {
  Config,
  AuthType,
  executeToolCall,
  ApprovalMode,
} from '../packages/core/dist/src/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

function requireEnv(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0 ? v : undefined;
}

async function loadDotEnvIfPresent() {
  try {
    // Load project .env first so .gemini/.env can override PROOF_HELPER_MODEL, etc.
    const rootEnvPath = path.join(process.cwd(), '.env');
    const rootContent = await fs.readFile(rootEnvPath, 'utf-8');
    for (const rawLine of rootContent.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore missing file
  }
  try {
    const dotenvPath = path.join(process.cwd(), '.gemini', '.env');
    const content = await fs.readFile(dotenvPath, 'utf-8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore missing file
  }
}

async function main() {
  await loadDotEnvIfPresent();
  const openaiKey = requireEnv('OPENAI_API_KEY');
  const proofModel = requireEnv('PROOF_HELPER_MODEL');

  if (!openaiKey) {
    console.error('Missing OPENAI_API_KEY in env. Set it and retry.');
    process.exit(2);
  }
  // If PROOF_HELPER_MODEL is not set, we'll rely on the tool's default
  // selection logic (now defaults to OpenAI gpt-5-nano-2025-08-07 when
  // OPENAI_API_KEY is available).

  const cfg = new Config({
    sessionId: `proof-smoke-${Date.now()}`,
    targetDir: process.cwd(),
    debugMode: true,
    cwd: process.cwd(),
    model: 'gemini-2.5-flash',
    interactive: false,
    trustedFolder: true,
    allowedTools: ['proof_helper', 'ProofHelperTool'],
  });

  await cfg.initialize();
  // Auto-approve tool execution for this smoke test
  try {
    cfg.setApprovalMode(ApprovalMode.YOLO);
  } catch (_) {
    // If disallowed for some reason, allowedTools still covers our use case.
  }
  // Initialize with any Gemini auth (no network on init). We only need this so
  // cfg.getContentGeneratorConfig() has a model value for the tool.
  await cfg.refreshAuth(AuthType.USE_GEMINI);

  const controller = new AbortController();

  // Tiny, quick problem to keep the test short
  const request = {
    callId: 'test-1',
    name: 'proof_helper',
    args: {
      problem: 'Prove that the sum of two even integers is even.',
      max_runs: 1,
      verbose: false,
    },
    isClientInitiated: true,
    prompt_id: 'proof-smoke',
  };

  console.log(
    '[Smoke] Starting proof_helper. Model setting:',
    proofModel || '(default)'
  );

  try {
    const res = await executeToolCall(cfg, request, controller.signal);
    if (res.error) {
      console.error('[Smoke] Tool error type:', res.errorType);
      console.error('[Smoke] Error:', res.error.message || res.error);
      process.exit(1);
    }
    console.log('[Smoke] Tool responded. Result display:');
    console.log(res.resultDisplay || '(no display)');
    console.log('[Smoke] Success. OpenAI requests appear to work.');
  } catch (e) {
    console.error('[Smoke] Exception while executing tool:', e?.message || e);
    process.exit(1);
  }
}

main();
