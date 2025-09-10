/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { MessageActionReturn, SlashCommand } from './types.js';
import { CommandKind } from './types.js';

async function persistEnvVar(rootDir: string, key: string, value: string) {
  const geminiDir = path.join(rootDir, '.gemini');
  const envPath = path.join(geminiDir, '.env');
  try {
    await fs.mkdir(geminiDir, { recursive: true });
    let content = '';
    try {
      content = await fs.readFile(envPath, 'utf-8');
    } catch (_) {
      // ignore missing file
    }
    const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
    const keyEq = key + '=';
    let replaced = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(keyEq)) {
        lines[i] = `${key}=${value}`;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      lines.push(`${key}=${value}`);
    }
    await fs.writeFile(envPath, lines.join('\n') + '\n', 'utf-8');
  } catch (e) {
    // Best-effort persistence; session env still updated below
    console.warn('[set-proof-model] Failed to persist .env:', e);
  }
}

/**
 * /set PROOF_HELPER_MODEL <option>
 * Options:
 * - gemini 2.5 pro (sets PROOF_HELPER_MODEL=gemini-2.5-pro)
 * - gpt-5 (sets PROOF_HELPER_MODEL=openai:gpt-5)
 */
export const setProofModelCommand: SlashCommand = {
  name: 'set',
  description:
    'Set a runtime setting. Usage: /set PROOF_HELPER_MODEL "gemini 2.5 pro"|"gpt-5"',
  kind: CommandKind.BUILT_IN,
  async action(_context, args): Promise<MessageActionReturn> {
    const trimmed = (args || '').trim();
    if (!trimmed || !trimmed.toUpperCase().startsWith('PROOF_HELPER_MODEL')) {
      return {
        type: 'message',
        messageType: 'error',
        content:
          'Usage: /set PROOF_HELPER_MODEL "gemini 2.5 pro" | "gpt-5"',
      };
    }

    // Extract value after the key
    const valuePart = trimmed.replace(/^[Pp][Rr][Oo][Oo][Ff]_[Hh][Ee][Ll][Pp][Ee][Rr]_[Mm][Oo][Dd][Ee][Ll]\s*/, '').trim();
    if (!valuePart) {
      return {
        type: 'message',
        messageType: 'info',
        content:
          'Current options: "gemini 2.5 pro" (default) or "gpt-5".',
      };
    }

    let envValue: string | null = null;
    const lower = valuePart.toLowerCase();
    if (lower === 'gemini 2.5 pro' || lower === 'gemini-2.5-pro') {
      envValue = 'gemini-2.5-pro';
    } else if (lower === 'gpt-5' || lower === 'openai:gpt-5') {
      envValue = 'openai:gpt-5';
    }

    if (!envValue) {
      return {
        type: 'message',
        messageType: 'error',
        content:
          'Unrecognized option. Use "gemini 2.5 pro" or "gpt-5".', 
      };
    }

    // Set in current session and persist to .gemini/.env
    process.env['PROOF_HELPER_MODEL'] = envValue;
    const rootDir = process.cwd();
    await persistEnvVar(rootDir, 'PROOF_HELPER_MODEL', envValue);

    return {
      type: 'message',
      messageType: 'info',
      content: `Set PROOF_HELPER_MODEL=${envValue}.` +
        (envValue.startsWith('openai:')
          ? ' Note: requires OPENAI_API_KEY in your .env (we can handle later).'
          : ''),
    };
  },
  async completion(_context, partialArg: string): Promise<string[]> {
    const suggestions = [
      'PROOF_HELPER_MODEL gemini 2.5 pro',
      'PROOF_HELPER_MODEL gpt-5',
    ];
    return suggestions.filter((s) => s.toLowerCase().startsWith(partialArg.toLowerCase()));
  },
};

