import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Verify Stripe webhook signature manually (no SDK needed)
async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {} as Record<string, string>);

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

// Get Stripe customer email (fetch from Stripe API if needed)
async function getCustomerEmail(session: Record<string, unknown>): Promise<string | null> {
  if (session.customer_email) return session.customer_email as string;
  if (session.customer_details && (session.customer_details as Record<string, unknown>).email) {
    return ((session.customer_details as Record<string, unknown>).email) as string;
  }
  // Fetch customer object from Stripe
  if (session.customer) {
    const res = await fetch(`https://api.stripe.com/v1/customers/${session.customer}`, {
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (res.ok) {
      const cust = await res.json();
      return cust.email || null;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const rawBody = await req.text();
    const sigHeader = req.headers.get("stripe-signature") || "";

    if (STRIPE_WEBHOOK_SECRET) {
      const valid = await verifyStripeSignature(rawBody, sigHeader, STRIPE_WEBHOOK_SECRET);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Record<string, unknown>;
      const email = await getCustomerEmail(session);

      if (!email) {
        return new Response(JSON.stringify({ error: "No email found in session" }), {
          status: 400,
          headers: { ...CORS, "Content-Type": "application/json" },
        });
      }

      const sb = createClient(SB_URL, SB_SERVICE_KEY);

      // Look up the most recent pending order for this email
      const { data: orders } = await sb
        .from("orders")
        .select("*")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1);

      const order = orders?.[0];

      // Mark order as paid
      if (order) {
        await sb.from("orders").update({ payment_status: "paid" }).eq("id", order.id);
      }

      // Check if client already exists
      const { data: existing } = await sb
        .from("clients")
        .select("id")
        .eq("email", email)
        .single();

      if (!existing) {
        const today = new Date().toISOString().split("T")[0];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextBilling = nextMonth.toISOString().split("T")[0];

        await sb.from("clients").insert([{
          name: order?.contact_name || email.split("@")[0],
          business_name: order?.business_name || "",
          email: email,
          phone: order?.phone || null,
          plan: "basis",
          billing_cycle: "monthly",
          status: "active",
          start_date: today,
          next_billing: nextBilling,
          setup_fee_waived: false,
        }]);
      } else {
        // Update status to active if already exists
        await sb.from("clients").update({ status: "active" }).eq("email", email);
      }

      return new Response(JSON.stringify({ received: true, email }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Other event types: acknowledge without action
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
