/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, type MessageActionReturn, type SlashCommand } from './types.js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const TOKEN_ENV = 'ECONOMIST_CLI_TOKEN';
const CONFIG_DIR = path.join(os.homedir(), '.economist');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

export const whoamiCommand: SlashCommand = {
  name: 'whoami',
  altNames: ['status'],
  description: 'Show current Economist CLI login status',
  kind: CommandKind.BUILT_IN,
  action: async (_context, _args): Promise<MessageActionReturn> => {
    const lines: string[] = [];

    // ENV override takes precedence if set
    if (process.env[TOKEN_ENV]) {
      lines.push('Linked: yes (via environment variable ECONOMIST_CLI_TOKEN)');
      lines.push('Note: The environment token overrides any saved session file.');
      return { type: 'message', messageType: 'info', content: lines.join('\n') };
    }

    // Otherwise check saved session file
    try {
      const stat = await fs.stat(SESSION_FILE);
      if (stat.isFile()) {
        // We intentionally do not print the token value for security.
        lines.push('Linked: yes (saved session file present)');
        lines.push(`Session file: ${SESSION_FILE}`);
        lines.push(`Last updated: ${new Date(stat.mtimeMs).toLocaleString()}`);
        return { type: 'message', messageType: 'info', content: lines.join('\n') };
      }
    } catch (e: any) {
      // Ignore ENOENT; treat as not logged in
      if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        return {
          type: 'message',
          messageType: 'error',
          content: `Could not determine login status: ${e?.message ?? String(e)}`,
        };
      }
    }

    // Not linked
    lines.push('Linked: no');
    lines.push('Use /login to start the device-link flow.');
    return { type: 'message', messageType: 'info', content: lines.join('\n') };
  },
};
