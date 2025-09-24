/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  GenerateContentParameters,
  GenerateContentResponse,
} from '@google/genai';
import os from 'node:os';
import path from 'node:path';
import fsp from 'node:fs/promises';
import type { ContentGenerator } from './contentGenerator.js';

export class ProxyContentGenerator implements ContentGenerator {
  constructor() {}

  private async getCliToken(): Promise<string> {
    const envToken = process.env['ECONOMIST_CLI_TOKEN']?.trim();
    if (envToken) return envToken;
    try {
      const sessionPath = path.join(os.homedir(), '.economist', 'session.json');
      const raw = await fsp.readFile(sessionPath, 'utf8');
      const json = JSON.parse(raw) as { token?: string };
      if (json?.token?.trim()) return json.token.trim();
    } catch {
      // ignore
    }
    throw new Error(
      'Missing CLI token. Please run the device-link flow again with /login.',
    );
  }

  private getSupabaseEnv(): { url: string } {
    const DEFAULT_SUPABASE_URL = 'https://giefigqpffbszyozgzkk.supabase.co';
    const supabaseUrl = (process.env['SUPABASE_URL'] || DEFAULT_SUPABASE_URL).trim();
    return { url: supabaseUrl.replace(/\/$/, '') };
  }

  private async proxyRequest<T>(
    pathStr: string,
    method: 'GET' | 'POST',
    body?: unknown,
    query?: Record<string, string>,
    expectStream?: boolean,
  ): Promise<T> {
    const { url } = this.getSupabaseEnv();
    const token = await this.getCliToken();
    const resp = await fetch(`${url}/functions/v1/genai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CLI-Token': token,
      },
      body: JSON.stringify({ path: pathStr, method, body, query, stream: !!expectStream }),
    });

    // For non-stream usage, parse JSON.
    const text = await resp.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!resp.ok) {
      const errMsg = (json && (json.error?.message || json.error || json.raw)) || resp.statusText;
      throw new Error(`genai-proxy error: ${errMsg}`);
    }
    return json as T;
  }

  async generateContent(
    req: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const model = encodeURIComponent(req.model);
    const pathStr = `/v1/models/${model}:generateContent`;
    return await this.proxyRequest<GenerateContentResponse>(
      pathStr,
      'POST',
      req,
    );
  }

  async generateContentStream(
    req: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    // For now, fallback to non-streaming call and yield once.
    const result = await this.generateContent(req, _userPromptId);
    return (async function* () {
      yield result;
    })();
  }

  async countTokens(req: CountTokensParameters): Promise<CountTokensResponse> {
    const model = encodeURIComponent(req.model);
    const pathStr = `/v1/models/${model}:countTokens`;
    return await this.proxyRequest<CountTokensResponse>(pathStr, 'POST', req);
  }

  async embedContent(
    req: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    const model = encodeURIComponent(req.model);
    const pathStr = `/v1/models/${model}:embedContent`;
    return await this.proxyRequest<EmbedContentResponse>(pathStr, 'POST', req);
  }
}
