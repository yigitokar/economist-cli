/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, type MessageActionReturn, type SlashCommand } from './types.js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import open from 'open';

const TOKEN_ENV = 'ECONOMIST_CLI_TOKEN';
const SUPABASE_URL_ENV = 'SUPABASE_URL';
const SUPABASE_ANON_KEY_ENV = 'SUPABASE_ANON_KEY';

const CONFIG_DIR = path.join(os.homedir(), '.economist');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
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

async function saveToken(token: string): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  } catch {}
  const payload = JSON.stringify({ token }, null, 2);
  await fs.writeFile(SESSION_FILE, payload, { mode: 0o600 });
}

export const loginCommand: SlashCommand = {
  name: 'login',
  altNames: ['link', 'sign-in'],
  description: 'Link your terminal to your account (device-link flow)',
  kind: CommandKind.BUILT_IN,
  action: async (_context, _args): Promise<MessageActionReturn> => {
    try {
      const supabaseUrl = requireEnv(SUPABASE_URL_ENV);
      const anonKey = requireEnv(SUPABASE_ANON_KEY_ENV);
      const base = supabaseUrl.replace(/\/$/, '');
      const headers = { Authorization: `Bearer ${anonKey}` };

      // Step 1: Issue link code
      const issueUrl = `${base}/functions/v1/issue-link-code`;
      const resp = await postJSON(issueUrl, {}, headers);
      const code: string | undefined = resp.code;
      const verification_url: string | undefined = resp.verification_url;
      if (!code || !verification_url) throw new Error('Invalid response from issue-link-code');

      let consoleMsg = `Device code: ${code}\nOpening browser: ${verification_url}`;
      try {
        await open(verification_url);
      } catch {
        consoleMsg += `\nIf it didn't open, manually open: ${verification_url}`;
      }

      // Step 2: Poll status
      const pollUrl = `${base}/functions/v1/poll-link-status?code=${encodeURIComponent(code)}`;
      const maxSeconds = 10 * 60;
      const intervalMs = 2000;
      const start = Date.now();
      // Provide a small progress indicator in the console output
      process.stdout.write('Waiting for account linking to complete');
      while (true) {
        const elapsed = (Date.now() - start) / 1000;
        if (elapsed > maxSeconds) {
          throw new Error('Linking timed out. Please retry.');
        }
        try {
          const statusResp = await getJSON(pollUrl, headers);
          const status: string = statusResp.status ?? 'unknown';
          if (status === 'linked') break;
          if (status === 'expired' || status === 'unknown') {
            throw new Error(`Link code ${status}. Please retry.`);
          }
        } catch (e) {
          // Ignore transient errors and continue polling
        }
        await new Promise((r) => setTimeout(r, intervalMs));
        process.stdout.write('.');
      }
      process.stdout.write('\n');

      // Step 3: Consume token
      const consumeUrl = `${base}/functions/v1/consume-link`;
      const consumeResp = await postJSON(consumeUrl, { code }, headers);
      const token: string | undefined = consumeResp.token;
      if (!token) throw new Error('Missing token in consume-link response');

      await saveToken(token);

      let envNote = '';
      if (process.env[TOKEN_ENV]) {
        envNote = '\nNote: ECONOMIST_CLI_TOKEN env var is set and takes precedence over the saved token.';
      }

      return {
        type: 'message',
        messageType: 'info',
        content: `${consoleMsg}\nLinked! Your terminal is now connected.${envNote}`,
      };
    } catch (e: any) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Login failed: ${e?.message ?? String(e)}`,
      };
    }
  },
};
