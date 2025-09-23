/**
 * Pro onboarding via device-link flow with Supabase Edge Functions.
 * - Requires env SUPABASE_URL and SUPABASE_ANON_KEY to call public Edge Functions
 * - Persists a CLI token to the user's config directory as a temporary solution
 *   (consider moving to keychain via `keytar` in a follow-up)
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import open from 'open';

const TOKEN_ENV = 'ECONOMIST_CLI_TOKEN';
const SUPABASE_URL_ENV = 'SUPABASE_URL';
const DEFAULT_SUPABASE_URL = 'https://giefigqpffbszyozgzkk.supabase.co';

const CONFIG_DIR = path.join(os.homedir(), '.economist');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

export type LinkStatus = 'pending' | 'linked' | 'expired' | 'unknown';

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function getSavedToken(): Promise<string | null> {
  // Env override takes precedence
  const envToken = process.env[TOKEN_ENV]?.trim();
  if (envToken) return envToken;

  if (!(await pathExists(SESSION_FILE))) return null;
  try {
    const raw = await fs.readFile(SESSION_FILE, 'utf8');
    const json = JSON.parse(raw) as { token?: string };
    return json.token ?? null;
  } catch {
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  if (!(await pathExists(CONFIG_DIR))) {
    await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  const payload = JSON.stringify({ token }, null, 2);
  await fs.writeFile(SESSION_FILE, payload, { mode: 0o600 });
}

function getEnvOrDefault(name: string, fallback?: string): string {
  const v = process.env[name]?.trim();
  return v || (fallback ?? '');
}

async function postJSON(url: string, body: unknown, headers: Record<string, string>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: `Non-JSON response (${res.status})`, raw: text };
  }
  if (!res.ok) {
    const err = json?.error || res.statusText;
    throw new Error(`POST ${url} failed: ${err}`);
  }
  return json as any;
}

async function getJSON(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: `Non-JSON response (${res.status})`, raw: text };
  }
  if (!res.ok) {
    const err = json?.error || res.statusText;
    throw new Error(`GET ${url} failed: ${err}`);
  }
  return json as any;
}

export async function ensureProOnboarding(): Promise<void> {
  // If token already present, allow startup
  const existing = await getSavedToken();
  if (existing) return;

  const supabaseUrl = getEnvOrDefault(SUPABASE_URL_ENV, DEFAULT_SUPABASE_URL);
  const base = supabaseUrl.replace(/\/$/, '');
  const headers: Record<string, string> = {};

  // Step 1: Issue link code
  const issueUrl = `${base}/functions/v1/issue-link-code`;
  let code: string;
  let verification_url: string;
  try {
    const resp = await postJSON(issueUrl, {}, headers);
    code = resp.code;
    verification_url = resp.verification_url;
    if (!code || !verification_url) throw new Error('Invalid response from issue-link-code');
  } catch (e: any) {
    console.error('\nEconomist CLI needs to link your account to continue.');
    console.error('Could not start device-link flow:', e?.message ?? e);
    console.error('Please ensure your Supabase Edge Functions have required env set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_BASE_URL).');
    process.exit(1);
  }

  // Step 2: Open browser (fallback to printing URL)
  console.log('\nSign-up required to use Economist CLI.');
  console.log(`Device code: ${code}`);
  console.log(`Opening browser: ${verification_url}`);
  try {
    if (process.env['SANDBOX'] && process.env['SANDBOX'] !== 'sandbox-exec') {
      // Sandbox environments may block opening
      console.log(`Please open this URL manually: ${verification_url}`);
    } else {
      await open(verification_url);
    }
  } catch {
    console.log(`Please open this URL manually: ${verification_url}`);
  }

  // Step 3: Poll link status
  const pollUrl = `${base}/functions/v1/poll-link-status?code=${encodeURIComponent(code)}`;
  const maxSeconds = 10 * 60; // 10 minutes
  const intervalMs = 2000;
  const start = Date.now();
  process.stdout.write('Waiting for account linking to complete');
  while (true) {
    const elapsed = (Date.now() - start) / 1000;
    if (elapsed > maxSeconds) {
      console.error('\nLinking timed out. Please retry.');
      process.exit(1);
    }
    try {
      const resp = await getJSON(pollUrl, headers);
      const status: LinkStatus = resp.status ?? 'unknown';
      if (status === 'linked') break;
      if (status === 'expired' || status === 'unknown') {
        console.error(`\nLink code ${status}. Please retry.`);
        process.exit(1);
      }
    } catch (e: any) {
      // transient network errors: ignore briefly
    }
    await new Promise((r) => setTimeout(r, intervalMs));
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  // Step 4: Consume token (one-time)
  const consumeUrl = `${base}/functions/v1/consume-link`;
  try {
    const resp = await postJSON(consumeUrl, { code }, headers);
    const token = resp.token as string | undefined;
    if (!token) throw new Error('Missing token in consume-link response');
    await saveToken(token);
    console.log('Welcome to Economist CLI Pro! Your account is now linked.');
  } catch (e: any) {
    console.error('Failed to finalize device link:', e?.message ?? e);
    process.exit(1);
  }
}
