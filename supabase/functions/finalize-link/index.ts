import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Missing env" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const { code, device_label } = await req.json().catch(() => ({}));
    if (!code) return json({ error: "Missing code" }, 400);

    // Validate device link exists and not expired
    const { data: link, error: linkErr } = await adminClient
      .from("device_links")
      .select("code, status, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return json({ error: "Invalid code" }, 404);
    if (new Date(link.expires_at).getTime() < Date.now()) return json({ error: "Code expired" }, 400);

    // Check entitlements for the authenticated user
    const { data: ent, error: entErr } = await userClient.rpc("get_entitlements");
    if (entErr) throw entErr;
    if (!ent?.[0]?.is_pro) {
      return json({ error: "Subscription required" }, 402);
    }

    // Mint CLI token
    const tokenPlain = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash = await sha256Hex(tokenPlain);

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const { error: insErr } = await adminClient.from("cli_tokens").insert({
      user_id: user.id,
      token_hash: tokenHash,
      device_label: device_label ?? "CLI",
      scopes: [],
      expires_at: expiresAt,
    });
    if (insErr) throw insErr;

    const mintedExp = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: upErr } = await adminClient
      .from("device_links")
      .update({ status: "linked", user_id: user.id, minted_token: tokenPlain, minted_token_expires_at: mintedExp })
      .eq("code", code);
    if (upErr) throw upErr;

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
