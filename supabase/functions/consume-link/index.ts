import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const { code } = await req.json().catch(() => ({}));
  if (!code) return json({ error: "Missing code" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Missing env" }, 500);
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const { data: link, error } = await sb
      .from("device_links")
      .select("status, minted_token, minted_token_expires_at")
      .eq("code", code)
      .maybeSingle();
    if (error) throw error;
    if (!link) return json({ error: "Invalid code" }, 404);

    const now = Date.now();
    const expired = link.minted_token_expires_at && new Date(link.minted_token_expires_at).getTime() < now;
    if (link.status !== "linked" || !link.minted_token || expired) {
      return json({ error: "Not ready" }, 409);
    }

    const token = link.minted_token as string;

    // One-time consumption: clear token fields
    const { error: upErr } = await sb
      .from("device_links")
      .update({ minted_token: null, minted_token_expires_at: null })
      .eq("code", code);
    if (upErr) throw upErr;

    return json({ token });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
