import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@12.16.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceKey) {
    return json({ error: "Missing env STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET/SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }, 500);
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return json({ error: "Missing Stripe-Signature" }, 400);

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    return json({ error: `Webhook signature verification failed: ${err}` }, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!customerId || !subId) break;

        const { data: custRow, error: custErr } = await sb
          .from("customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (custErr) throw custErr;
        const userId = custRow?.user_id as string | undefined;
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        await sb.from("subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          product_id: (subscription.items.data[0]?.price.product as string) ?? "unknown",
          price_id: subscription.items.data[0]?.price.id ?? "unknown",
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          metadata: subscription.metadata as Record<string, unknown> ?? {},
        }, { onConflict: "stripe_subscription_id" });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;
        const { data: custRow } = await sb
          .from("customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
        const userId = custRow?.user_id as string | undefined;
        if (!userId) break;
        await sb.from("subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          product_id: (subscription.items.data[0]?.price.product as string) ?? "unknown",
          price_id: subscription.items.data[0]?.price.id ?? "unknown",
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          metadata: subscription.metadata as Record<string, unknown> ?? {},
        }, { onConflict: "stripe_subscription_id" });
        break;
      }
      default:
        // ignore other events
        break;
    }

    return json({ received: true });
  } catch (e) {
    console.error("Webhook processing error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
