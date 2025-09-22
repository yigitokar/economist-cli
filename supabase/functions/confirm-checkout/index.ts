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
  if (!supabaseUrl || !anonKey || !serviceKey || !stripeSecret) return json({ error: "Missing env" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  try {
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const { session_id, code } = await req.json().catch(() => ({}));
    if (!session_id || !code) return json({ error: "Missing session_id or code" }, 400);

    // Retrieve checkout session and subscription
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session || session.client_reference_id !== code) return json({ error: "Invalid session or code mismatch" }, 400);

    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (!subId) return json({ error: "Missing subscription id" }, 400);

    const subscription = await stripe.subscriptions.retrieve(subId);

    // Upsert customer mapping
    const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
    if (!stripeCustomerId) return json({ error: "Missing customer id" }, 400);
    const { error: upCustErr } = await adminClient
      .from("customers")
      .upsert({ user_id: user.id, stripe_customer_id: stripeCustomerId }, { onConflict: "user_id" });
    if (upCustErr) throw upCustErr;

    // Upsert subscription
    const { error: upSubErr } = await adminClient
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        stripe_subscription_id: subscription.id,
        product_id: (subscription.items.data[0]?.price.product as string) ?? "unknown",
        price_id: subscription.items.data[0]?.price.id ?? "unknown",
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: subscription.metadata as Record<string, unknown> ?? {},
      }, { onConflict: "stripe_subscription_id" });
    if (upSubErr) throw upSubErr;

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
