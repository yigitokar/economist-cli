import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cli-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isAllowedGenAIPath(path: string): boolean {
  // Allow only Generative Language API paths under v1/v1beta
  return (
    path.startsWith("/v1/") ||
    path.startsWith("/v1beta/")
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const googleApiKey =
    Deno.env.get("GOOGLE_API_KEY") ||
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("google_api_key") ||
    Deno.env.get("gemini_api_key");
  const freeMode = Deno.env.get("FREE_MODE") === "true";

  if (!supabaseUrl || !serviceKey) return json({ error: "Missing env SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }, 500);
  if (!googleApiKey) return json({ error: "Missing env GOOGLE_API_KEY or GEMINI_API_KEY" }, 500);

  // Verify CLI token
  const cliToken = req.headers.get("x-cli-token") || req.headers.get("X-CLI-Token");
  if (!cliToken) return json({ error: "Missing X-CLI-Token" }, 401);

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const tokenHash = await sha256Hex(cliToken);
    const { data: tokenRow, error: tokenErr } = await adminClient
      .from("cli_tokens")
      .select("user_id, expires_at")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (tokenErr) throw tokenErr;
    if (!tokenRow) return json({ error: "Unauthorized" }, 401);

    // Enforce Pro entitlement unless FREE_MODE
    if (!freeMode) {
      const { data: sub, error: subErr } = await adminClient
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", tokenRow.user_id)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subErr) throw subErr;
      const active = sub && (sub.status === "active" || sub.status === "trialing") && new Date(sub.current_period_end).getTime() > Date.now();
      if (!active) return json({ error: "Subscription required" }, 402);
    }

    // Parse request payload
    const payload = await req.json().catch(() => ({})) as {
      path?: string;
      method?: string;
      body?: unknown;
      query?: Record<string, string>;
      stream?: boolean;
    };

    const path = (payload.path || "").trim();
    if (!path || !isAllowedGenAIPath(path)) {
      return json({ error: "Invalid or disallowed path" }, 400);
    }

    const base = "https://generativelanguage.googleapis.com";
    const url = new URL(base + path);
    url.searchParams.set("key", googleApiKey);
    if (payload.query) {
      for (const [k, v] of Object.entries(payload.query)) url.searchParams.set(k, v);
    }

    const method = (payload.method || "POST").toUpperCase();
    const upstream = await fetch(url.toString(), {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(payload.body ?? {}),
    });

    // Pass through streaming or JSON
    const ct = upstream.headers.get("content-type") || "application/json";
    if (ct.includes("text/event-stream") || payload.stream) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": ct, ...corsHeaders },
      });
    }

    const text = await upstream.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!upstream.ok) return json({ error: data }, upstream.status);
    return json(data, upstream.status);
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
