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
    'Set a runtime setting. Usage: /set PROOF_HELPER_MODEL gemini 2.5 pro|gpt-5 OR /set DEEP_RESEARCH_MODEL o4-mini|o3 OR /set GPT5_REASONING_EFFORT low|medium|high (quotes optional)',
  kind: CommandKind.BUILT_IN,
  async action(_context, args): Promise<MessageActionReturn> {
    const trimmed = (args || '').trim();
    if (!trimmed) {
      return {
        type: 'message',
        messageType: 'error',
        content:
          'Usage: /set PROOF_HELPER_MODEL gemini 2.5 pro|gpt-5 OR /set DEEP_RESEARCH_MODEL o4-mini|o3 OR /set GPT5_REASONING_EFFORT low|medium|high (quotes optional)',
      };
    }

    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(.*)$/);
    if (!m) {
      return {
        type: 'message',
        messageType: 'error',
        content:
          'Usage: /set PROOF_HELPER_MODEL gemini 2.5 pro|gpt-5 OR /set DEEP_RESEARCH_MODEL o4-mini|o3 OR /set GPT5_REASONING_EFFORT low|medium|high (quotes optional)',
      };
    }

    const key = m[1];
    const valuePart = (m[2] || '').trim();

    // Helper: normalize a user-provided value by stripping surrounding quotes and lowercasing.
    const normalizeValue = (v: string) => v.replace(/^['"]+|['"]+$/g, '').trim().toLowerCase();

    // Handle PROOF_HELPER_MODEL
    if (key.toUpperCase() === 'PROOF_HELPER_MODEL') {
      if (!valuePart) {
        return {
          type: 'message',
          messageType: 'info',
          content: 'Current options: "gemini 2.5 pro" (default) or "gpt-5".',
        };
      }
      let envValue: string | null = null;
      const lower = normalizeValue(valuePart);
      if (lower === 'gemini 2.5 pro' || lower === 'gemini-2.5-pro') {
        envValue = 'gemini-2.5-pro';
      } else if (lower === 'gpt-5' || lower === 'openai:gpt-5') {
        envValue = 'openai:gpt-5';
      }
      if (!envValue) {
        return {
          type: 'message',
          messageType: 'error',
          content: 'Unrecognized option. Use "gemini 2.5 pro" or "gpt-5".',
        };
      }
      process.env['PROOF_HELPER_MODEL'] = envValue;
      const rootDir = process.cwd();
      await persistEnvVar(rootDir, 'PROOF_HELPER_MODEL', envValue);
      return {
        type: 'message',
        messageType: 'info',
        content:
          `Set PROOF_HELPER_MODEL=${envValue}.` +
          (envValue.startsWith('openai:')
            ? ' Note: requires OPENAI_API_KEY in your .env.'
            : ''),
      };
    }

    // Handle DEEP_RESEARCH_MODEL
    if (key.toUpperCase() === 'DEEP_RESEARCH_MODEL') {
      if (!valuePart) {
        return {
          type: 'message',
          messageType: 'info',
          content:
            'Current options: "o4-mini" (default) or "o3". This sets DEEP_RESEARCH_MODEL=openai:<model>.',
        };
      }
      const lower = normalizeValue(valuePart);
      let envValue: string | null = null;
      if (
        lower === 'o4-mini' ||
        lower === 'o4' ||
        lower === 'o4-mini-deep-research-2025-06-26' ||
        lower === 'openai:o4-mini-deep-research-2025-06-26'
      ) {
        envValue = 'openai:o4-mini-deep-research-2025-06-26';
      } else if (
        lower === 'o3' ||
        lower === 'o3-deep-research-2025-06-26' ||
        lower === 'openai:o3-deep-research-2025-06-26'
      ) {
        envValue = 'openai:o3-deep-research-2025-06-26';
      }
      if (!envValue) {
        return {
          type: 'message',
          messageType: 'error',
          content:
            'Unrecognized option. Use "o4-mini" (default) or "o3". Example: /set DEEP_RESEARCH_MODEL o4-mini',
        };
      }
      process.env['DEEP_RESEARCH_MODEL'] = envValue;
      const rootDir = process.cwd();
      await persistEnvVar(rootDir, 'DEEP_RESEARCH_MODEL', envValue);
      return {
        type: 'message',
        messageType: 'info',
        content:
          `Set DEEP_RESEARCH_MODEL=${envValue}. Requires OPENAI_API_KEY in your .env.`,
      };
    }

    // Handle GPT5_REASONING_EFFORT
    if (key.toUpperCase() === 'GPT5_REASONING_EFFORT') {
      if (!valuePart) {
        return {
          type: 'message',
          messageType: 'info',
          content: 'Usage: /set GPT5_REASONING_EFFORT low|medium|high (default: low).',
        };
      }
      const lower = normalizeValue(valuePart);
      if (!['low', 'medium', 'high'].includes(lower)) {
        return {
          type: 'message',
          messageType: 'error',
          content: 'Unrecognized option. Use low, medium, or high.',
        };
      }
      process.env['GPT5_REASONING_EFFORT'] = lower;
      const rootDir = process.cwd();
      await persistEnvVar(rootDir, 'GPT5_REASONING_EFFORT', lower);
      return {
        type: 'message',
        messageType: 'info',
        content: `Set GPT5_REASONING_EFFORT=${lower}.`,
      };
    }

    return {
      type: 'message',
      messageType: 'error',
      content:
        'Unsupported key. Use PROOF_HELPER_MODEL, DEEP_RESEARCH_MODEL, or GPT5_REASONING_EFFORT.',
    };
  },
  async completion(_context, partialArg: string): Promise<string[]> {
    const suggestions = [
      'PROOF_HELPER_MODEL gemini 2.5 pro',
      'PROOF_HELPER_MODEL gpt-5',
      'DEEP_RESEARCH_MODEL o4-mini',
      'DEEP_RESEARCH_MODEL o3',
      'GPT5_REASONING_EFFORT medium',
    ];
    return suggestions.filter((s) => s.toLowerCase().startsWith(partialArg.toLowerCase()));
  },
};
