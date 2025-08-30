/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';
import type { SemanticColors } from './semantic-tokens.js';
import { resolveColor } from './color-utils.js';

export type ThemeType = 'light' | 'dark' | 'ansi' | 'custom';

export interface ColorsTheme {
  type: ThemeType;
  Background: string;
  Foreground: string;
  LightBlue: string;
  AccentBlue: string;
  AccentPurple: string;
  AccentCyan: string;
  AccentGreen: string;
  AccentYellow: string;
  AccentRed: string;
  DiffAdded: string;
  DiffRemoved: string;
  Comment: string;
  Gray: string;
  GradientColors?: string[];
}

export interface CustomTheme {
  type: 'custom';
  name: string;

  text?: {
    primary?: string;
    secondary?: string;
    link?: string;
    accent?: string;
  };
  background?: {
    primary?: string;
    diff?: {
      added?: string;
      removed?: string;
    };
  };
  border?: {
    default?: string;
    focused?: string;
  };
  ui?: {
    comment?: string;
    symbol?: string;
    gradient?: string[];
  };
  status?: {
    error?: string;
    success?: string;
    warning?: string;
  };

  // Legacy properties (all optional)
  Background?: string;
  Foreground?: string;
  LightBlue?: string;
  AccentBlue?: string;
  AccentPurple?: string;
  AccentCyan?: string;
  AccentGreen?: string;
  AccentYellow?: string;
  AccentRed?: string;
  DiffAdded?: string;
  DiffRemoved?: string;
  Comment?: string;
  Gray?: string;
  GradientColors?: string[];
}

export const lightTheme: ColorsTheme = {
  type: 'light',
  Background: '#FFF5F0',
  Foreground: '#4A2040',
  LightBlue: '#FF8E53',
  AccentBlue: '#FF6B6B',
  AccentPurple: '#8B4560',
  AccentCyan: '#FF7F50',
  AccentGreen: '#D2691E',
  AccentYellow: '#D2691E',
  AccentRed: '#DC143C',
  DiffAdded: '#C6EAD8',
  DiffRemoved: '#FFCCCC',
  Comment: '#8B5A6C',
  Gray: '#A8667A',
  GradientColors: ['#FF4500', '#FF69B4', '#FF1493'],
};

export const darkTheme: ColorsTheme = {
  type: 'dark',
  Background: '#1A0F1F',
  Foreground: '#FFDAB9',
  LightBlue: '#FFB088',
  AccentBlue: '#FF6B6B',
  AccentPurple: '#C44569',
  AccentCyan: '#FF8E53',
  AccentGreen: '#FFA07A',
  AccentYellow: '#FFD93D',
  AccentRed: '#EE4E34',
  DiffAdded: '#28350B',
  DiffRemoved: '#430000',
  Comment: '#CD919E',
  Gray: '#CD919E',
  GradientColors: ['#FF6B6B', '#FFA07A', '#C44569'],
};

export const ansiTheme: ColorsTheme = {
  type: 'ansi',
  Background: 'black',
  Foreground: 'white',
  LightBlue: 'blue',
  AccentBlue: 'blue',
  AccentPurple: 'magenta',
  AccentCyan: 'cyan',
  AccentGreen: 'green',
  AccentYellow: 'yellow',
  AccentRed: 'red',
  DiffAdded: 'green',
  DiffRemoved: 'red',
  Comment: 'gray',
  Gray: 'gray',
};

export class Theme {
  /**
   * The default foreground color for text when no specific highlight rule applies.
   * This is an Ink-compatible color string (hex or name).
   */
  readonly defaultColor: string;
  /**
   * Stores the mapping from highlight.js class names (e.g., 'hljs-keyword')
   * to Ink-compatible color strings (hex or name).
   */
  protected readonly _colorMap: Readonly<Record<string, string>>;
  readonly semanticColors: SemanticColors;

  /**
   * Creates a new Theme instance.
   * @param name The name of the theme.
   * @param rawMappings The raw CSSProperties mappings from a react-syntax-highlighter theme object.
   */
  constructor(
    readonly name: string,
    readonly type: ThemeType,
    rawMappings: Record<string, CSSProperties>,
    readonly colors: ColorsTheme,
    semanticColors?: SemanticColors,
  ) {
    this.semanticColors = semanticColors ?? {
      text: {
        primary: this.colors.Foreground,
        secondary: this.colors.Gray,
        link: this.colors.AccentBlue,
        accent: this.colors.AccentPurple,
      },
      background: {
        primary: this.colors.Background,
        diff: {
          added: this.colors.DiffAdded,
          removed: this.colors.DiffRemoved,
        },
      },
      border: {
        default: this.colors.Gray,
        focused: this.colors.AccentBlue,
      },
      ui: {
        comment: this.colors.Comment,
        symbol: this.colors.Gray,
        gradient: this.colors.GradientColors,
      },
      status: {
        error: this.colors.AccentRed,
        success: this.colors.AccentGreen,
        warning: this.colors.AccentYellow,
      },
    };
    this._colorMap = Object.freeze(this._buildColorMap(rawMappings)); // Build and freeze the map

    // Determine the default foreground color
    const rawDefaultColor = rawMappings['hljs']?.color;
    this.defaultColor =
      (rawDefaultColor ? Theme._resolveColor(rawDefaultColor) : undefined) ??
      ''; // Default to empty string if not found or resolvable
  }

  /**
   * Gets the Ink-compatible color string for a given highlight.js class name.
   * @param hljsClass The highlight.js class name (e.g., 'hljs-keyword', 'hljs-string').
   * @returns The corresponding Ink color string (hex or name) if it exists.
   */
  getInkColor(hljsClass: string): string | undefined {
    return this._colorMap[hljsClass];
  }

  /**
   * Resolves a CSS color value (name or hex) into an Ink-compatible color string.
   * @param colorValue The raw color string (e.g., 'blue', '#ff0000', 'darkkhaki').
   * @returns An Ink-compatible color string (hex or name), or undefined if not resolvable.
   */
  private static _resolveColor(colorValue: string): string | undefined {
    return resolveColor(colorValue);
  }

  /**
   * Builds the internal map from highlight.js class names to Ink-compatible color strings.
   * This method is protected and primarily intended for use by the constructor.
   * @param hljsTheme The raw CSSProperties mappings from a react-syntax-highlighter theme object.
   * @returns An Ink-compatible theme map (Record<string, string>).
   */
  protected _buildColorMap(
    hljsTheme: Record<string, CSSProperties>,
  ): Record<string, string> {
    const inkTheme: Record<string, string> = {};
    for (const key in hljsTheme) {
      // Ensure the key starts with 'hljs-' or is 'hljs' for the base style
      if (!key.startsWith('hljs-') && key !== 'hljs') {
        continue; // Skip keys not related to highlighting classes
      }

      const style = hljsTheme[key];
      if (style?.color) {
        const resolvedColor = Theme._resolveColor(style.color);
        if (resolvedColor !== undefined) {
          // Use the original key from the hljsTheme (e.g., 'hljs-keyword')
          inkTheme[key] = resolvedColor;
        }
        // If color is not resolvable, it's omitted from the map,
        // this enables falling back to the default foreground color.
      }
      // We currently only care about the 'color' property for Ink rendering.
      // Other properties like background, fontStyle, etc., are ignored.
    }
    return inkTheme;
  }
}

/**
 * Creates a Theme instance from a custom theme configuration.
 * @param customTheme The custom theme configuration.
 * @returns A new Theme instance.
 */
export function createCustomTheme(customTheme: CustomTheme): Theme {
  const colors: ColorsTheme = {
    type: 'custom',
    Background: customTheme.background?.primary ?? customTheme.Background ?? '',
    Foreground: customTheme.text?.primary ?? customTheme.Foreground ?? '',
    LightBlue: customTheme.text?.link ?? customTheme.LightBlue ?? '',
    AccentBlue: customTheme.text?.link ?? customTheme.AccentBlue ?? '',
    AccentPurple: customTheme.text?.accent ?? customTheme.AccentPurple ?? '',
    AccentCyan: customTheme.text?.link ?? customTheme.AccentCyan ?? '',
    AccentGreen: customTheme.status?.success ?? customTheme.AccentGreen ?? '',
    AccentYellow: customTheme.status?.warning ?? customTheme.AccentYellow ?? '',
    AccentRed: customTheme.status?.error ?? customTheme.AccentRed ?? '',
    DiffAdded:
      customTheme.background?.diff?.added ?? customTheme.DiffAdded ?? '',
    DiffRemoved:
      customTheme.background?.diff?.removed ?? customTheme.DiffRemoved ?? '',
    Comment: customTheme.ui?.comment ?? customTheme.Comment ?? '',
    Gray: customTheme.text?.secondary ?? customTheme.Gray ?? '',
    GradientColors: customTheme.ui?.gradient ?? customTheme.GradientColors,
  };

  // Generate CSS properties mappings based on the custom theme colors
  const rawMappings: Record<string, CSSProperties> = {
    hljs: {
      display: 'block',
      overflowX: 'auto',
      padding: '0.5em',
      background: colors.Background,
      color: colors.Foreground,
    },
    'hljs-keyword': {
      color: colors.AccentBlue,
    },
    'hljs-literal': {
      color: colors.AccentBlue,
    },
    'hljs-symbol': {
      color: colors.AccentBlue,
    },
    'hljs-name': {
      color: colors.AccentBlue,
    },
    'hljs-link': {
      color: colors.AccentBlue,
      textDecoration: 'underline',
    },
    'hljs-built_in': {
      color: colors.AccentCyan,
    },
    'hljs-type': {
      color: colors.AccentCyan,
    },
    'hljs-number': {
      color: colors.AccentGreen,
    },
    'hljs-class': {
      color: colors.AccentGreen,
    },
    'hljs-string': {
      color: colors.AccentYellow,
    },
    'hljs-meta-string': {
      color: colors.AccentYellow,
    },
    'hljs-regexp': {
      color: colors.AccentRed,
    },
    'hljs-template-tag': {
      color: colors.AccentRed,
    },
    'hljs-subst': {
      color: colors.Foreground,
    },
    'hljs-function': {
      color: colors.Foreground,
    },
    'hljs-title': {
      color: colors.Foreground,
    },
    'hljs-params': {
      color: colors.Foreground,
    },
    'hljs-formula': {
      color: colors.Foreground,
    },
    'hljs-comment': {
      color: colors.Comment,
      fontStyle: 'italic',
    },
    'hljs-quote': {
      color: colors.Comment,
      fontStyle: 'italic',
    },
    'hljs-doctag': {
      color: colors.Comment,
    },
    'hljs-meta': {
      color: colors.Gray,
    },
    'hljs-meta-keyword': {
      color: colors.Gray,
    },
    'hljs-tag': {
      color: colors.Gray,
    },
    'hljs-variable': {
      color: colors.AccentPurple,
    },
    'hljs-template-variable': {
      color: colors.AccentPurple,
    },
    'hljs-attr': {
      color: colors.LightBlue,
    },
    'hljs-attribute': {
      color: colors.LightBlue,
    },
    'hljs-builtin-name': {
      color: colors.LightBlue,
    },
    'hljs-section': {
      color: colors.AccentYellow,
    },
    'hljs-emphasis': {
      fontStyle: 'italic',
    },
    'hljs-strong': {
      fontWeight: 'bold',
    },
    'hljs-bullet': {
      color: colors.AccentYellow,
    },
    'hljs-selector-tag': {
      color: colors.AccentYellow,
    },
    'hljs-selector-id': {
      color: colors.AccentYellow,
    },
    'hljs-selector-class': {
      color: colors.AccentYellow,
    },
    'hljs-selector-attr': {
      color: colors.AccentYellow,
    },
    'hljs-selector-pseudo': {
      color: colors.AccentYellow,
    },
    'hljs-addition': {
      backgroundColor: colors.AccentGreen,
      display: 'inline-block',
      width: '100%',
    },
    'hljs-deletion': {
      backgroundColor: colors.AccentRed,
      display: 'inline-block',
      width: '100%',
    },
  };

  const semanticColors: SemanticColors = {
    text: {
      primary: colors.Foreground,
      secondary: colors.Gray,
      link: colors.AccentBlue,
      accent: colors.AccentPurple,
    },
    background: {
      primary: colors.Background,
      diff: {
        added: colors.DiffAdded,
        removed: colors.DiffRemoved,
      },
    },
    border: {
      default: colors.Gray,
      focused: colors.AccentBlue,
    },
    ui: {
      comment: colors.Comment,
      symbol: colors.Gray,
      gradient: colors.GradientColors,
    },
    status: {
      error: colors.AccentRed,
      success: colors.AccentGreen,
      warning: colors.AccentYellow,
    },
  };

  return new Theme(
    customTheme.name,
    'custom',
    rawMappings,
    colors,
    semanticColors,
  );
}

/**
 * Validates a custom theme configuration.
 * @param customTheme The custom theme to validate.
 * @returns An object with isValid boolean and error message if invalid.
 */
export function validateCustomTheme(customTheme: Partial<CustomTheme>): {
  isValid: boolean;
  error?: string;
  warning?: string;
} {
  // Since all fields are optional, we only need to validate the name.
  if (customTheme.name && !isValidThemeName(customTheme.name)) {
    return {
      isValid: false,
      error: `Invalid theme name: ${customTheme.name}`,
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Checks if a theme name is valid.
 * @param name The theme name to validate.
 * @returns True if the theme name is valid.
 */
function isValidThemeName(name: string): boolean {
  // Theme name should be non-empty and not contain invalid characters
  return name.trim().length > 0 && name.trim().length <= 50;
}
