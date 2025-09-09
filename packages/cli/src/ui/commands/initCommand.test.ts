/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { initCommand } from './initCommand.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { type CommandContext } from './types.js';

// Mock the 'fs' module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('initCommand', () => {
  let mockContext: CommandContext;
  const targetDir = '/test/dir';
  const econMdPath = path.join(targetDir, 'ECON.md');

  beforeEach(() => {
    // Create a fresh mock context for each test
    mockContext = createMockCommandContext({
      services: {
        config: {
          getTargetDir: () => targetDir,
        },
      },
    });
  });

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
  });

  it('should not overwrite ECON.md if it exists and still enter triage mode', async () => {
    // Arrange: Simulate that the file exists
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Act: Run the command's action
    const result = await initCommand.action!(mockContext, '');

    // Assert: Ensure no file was written
    expect(fs.writeFileSync).not.toHaveBeenCalled();

    // Assert: Info message added to UI
    expect(mockContext.ui.addItem).toHaveBeenCalledWith(
      {
        type: 'info',
        text: 'Found existing ECON.md. Not overwriting. Entering triage mode…',
      },
      expect.any(Number),
    );

    // Assert: Triage prompt is submitted
    expect(result.type).toBe('submit_prompt');
    expect(result.content).toContain('economist triage and planning agent');
  });

  it('should create ECON.md and submit a triage prompt if it does not exist', async () => {
    // Arrange: Simulate that the file does not exist
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Act: Run the command's action
    const result = await initCommand.action!(mockContext, '');

    // Assert: Check that writeFileSync was called correctly
    expect(fs.writeFileSync).toHaveBeenCalledWith(econMdPath, '', 'utf8');

    // Assert: Check that an informational message was added to the UI
    expect(mockContext.ui.addItem).toHaveBeenCalledWith(
      {
        type: 'info',
        text: 'Created ECON.md. Entering triage mode to tailor it to your project…',
      },
      expect.any(Number),
    );

    // Assert: Check that the correct prompt is submitted
    expect(result.type).toBe('submit_prompt');
    expect(result.content).toContain('economist triage and planning agent');
    expect(result.content).toContain('/ECON.md');
  });

  it('should return an error if config is not available', async () => {
    // Arrange: Create a context without config
    const noConfigContext = createMockCommandContext();
    if (noConfigContext.services) {
      noConfigContext.services.config = null;
    }

    // Act: Run the command's action
    const result = await initCommand.action!(noConfigContext, '');

    // Assert: Check for the correct error message
    expect(result).toEqual({
      type: 'message',
      messageType: 'error',
      content: 'Configuration not available.',
    });
  });
});
