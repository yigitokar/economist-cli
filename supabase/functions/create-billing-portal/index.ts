import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@12.16.0";

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
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const appBaseUrl = Deno.env.get("APP_BASE_URL");
  if (!supabaseUrl || !anonKey || !serviceKey || !stripeSecret || !appBaseUrl) return json({ error: "Missing env" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  try {
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const { data: custRow, error: custErr } = await adminClient.from("customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (custErr) throw custErr;

    let stripeCustomerId = custRow?.stripe_customer_id as string | undefined;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      stripeCustomerId = customer.id;
      const { error: insErr } = await adminClient.from("customers").insert({ user_id: user.id, stripe_customer_id: stripeCustomerId });
      if (insErr) throw insErr;
    }

    const session = await stripe.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: `${appBaseUrl.replace(/\/$/, "")}/portal-return` });
    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
