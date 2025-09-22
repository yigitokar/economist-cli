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
  const defaultPrice = Deno.env.get("STRIPE_PRICE_PRO_MONTHLY");
  const appBaseUrl = Deno.env.get("APP_BASE_URL");
  if (!supabaseUrl || !anonKey || !serviceKey || !stripeSecret || !appBaseUrl) {
    return json({ error: "Missing env SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY/STRIPE_SECRET_KEY/APP_BASE_URL" }, 500);
  }
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  try {
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    const { code, price_id, device_label } = await req.json().catch(() => ({}));
    if (!code) return json({ error: "Missing code" }, 400);
    const priceId = price_id || defaultPrice;
    if (!priceId) return json({ error: "Missing STRIPE_PRICE_PRO_MONTHLY or price_id" }, 400);

    // Validate device link
    const { data: link, error: linkErr } = await adminClient
      .from("device_links").select("code, status, expires_at").eq("code", code).maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) return json({ error: "Invalid code" }, 404);
    if (new Date(link.expires_at).getTime() < Date.now()) return json({ error: "Code expired" }, 400);

    // Ensure Stripe customer
    let stripeCustomerId: string | null = null;
    const { data: custRow } = await adminClient.from("customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (custRow?.stripe_customer_id) {
      stripeCustomerId = custRow.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
      stripeCustomerId = customer.id;
      const { error: insCustErr } = await adminClient.from("customers").insert({ user_id: user.id, stripe_customer_id: stripeCustomerId });
      if (insCustErr) throw insCustErr;
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: stripeCustomerId!,
      success_url: `${appBaseUrl.replace(/\/$/, "")}/success?session_id={CHECKOUT_SESSION_ID}&code=${code}`,
      cancel_url: `${appBaseUrl.replace(/\/$/, "")}/cancel?code=${code}`,
      client_reference_id: code,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
    });

    // Store client_reference_id on device link (optional)
    await adminClient.from("device_links").update({ client_reference_id: code }).eq("code", code);

    return json({ url: session.url });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
