/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, type MessageActionReturn, type SlashCommand } from './types.js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const CONFIG_DIR = path.join(os.homedir(), '.economist');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');

export const signOutCommand: SlashCommand = {
  name: 'sign-out',
  altNames: ['logout', 'signout'],
  description: 'Sign out by clearing the local Economist CLI token',
  kind: CommandKind.BUILT_IN,
  action: async (_context, _args): Promise<MessageActionReturn> => {
    let message = '';
    try {
      await fs.unlink(SESSION_FILE);
      message = 'Signed out: local CLI token removed. Restart the CLI to relink your account.';
    } catch (e: any) {
      if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') {
        message = 'No saved session found. You are already signed out. Restart the CLI to relink if needed.';
      } else {
        message = `Error removing local session: ${e?.message ?? String(e)}`;
      }
    }

    if (process.env['ECONOMIST_CLI_TOKEN']) {
      message += '\nNote: ENV override ECONOMIST_CLI_TOKEN is set; unset it to fully sign out: `unset ECONOMIST_CLI_TOKEN`';
    }

    return { type: 'message', messageType: 'info', content: message };
  },
};
