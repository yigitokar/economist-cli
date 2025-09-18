/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { type Config, getAllGeminiMdFilenames } from '@google/gemini-cli-core';

interface TipsProps {
  config: Config;
}

export const Tips: React.FC<TipsProps> = ({ config: _config }) => {
  const contextNames = getAllGeminiMdFilenames();
  const allNamesTheSame = new Set(contextNames).size < 2;
  const nameLabel = allNamesTheSame ? contextNames[0] : 'context';
  return (
    <Box flexDirection="column">
      <Text color={Colors.Gray}>Tips for getting started:</Text>
      <Text color={Colors.Gray}>
        1. Use{' '}
        <Text bold color={Colors.AccentPurple}>
          /init
        </Text>{' '}
        to start a new economics project and create an{' '}
        <Text bold color={Colors.AccentPurple}>
          {nameLabel}
        </Text>{' '}
        file.
      </Text>
      <Text color={Colors.Gray}>
        2. Ask for proof help, literature review, or paper implementation.
      </Text>
      <Text color={Colors.Gray}>
        3. Ask for data analysis, econometric modeling.
      </Text>
      <Text color={Colors.Gray}>
        4.{' '}
        <Text bold color={Colors.AccentPurple}>
          /help
        </Text>{' '}
        for more information.
      </Text>
    </Box>
  );
};
