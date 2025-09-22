import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appBaseUrl = Deno.env.get("APP_BASE_URL");
  if (!supabaseUrl || !serviceKey || !appBaseUrl) {
    return json({ error: "Missing env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / APP_BASE_URL" }, 500);
  }
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const codeBytes = crypto.getRandomValues(new Uint8Array(24)); // 192-bit
    const code = b64url(codeBytes);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error } = await sb.from("device_links").insert({
      code,
      status: "pending",
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    });
    if (error) throw error;

    const verification_url = `${appBaseUrl.replace(/\/$/, "")}/sign-up?code=${code}`;

    return json({ code, verification_url, expires_at: expiresAt });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
