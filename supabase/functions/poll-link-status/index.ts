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
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return json({ error: "Missing code" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Missing env" }, 500);
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const { data, error } = await sb.from("device_links").select("status, expires_at").eq("code", code).maybeSingle();
    if (error) throw error;
    if (!data) return json({ status: "unknown" }, 404);

    const expired = new Date(data.expires_at).getTime() < Date.now();
    const status = expired ? "expired" : data.status;

    return json({ status });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
