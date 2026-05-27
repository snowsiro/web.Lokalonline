import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL    = "snowsiro@gmail.com";
const FROM_EMAIL     = "lokalonline.at <noreply@lokalonline.at>";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  return res.ok;
}

function emailBase(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .header { background: #111; padding: 28px 32px; }
  .header span { color: #fff; font-size: 18px; font-weight: 700; letter-spacing: -.02em; }
  .header span em { color: #C8302A; font-style: normal; }
  .body { padding: 32px; color: #333; font-size: 15px; line-height: 1.6; }
  .body h2 { margin: 0 0 16px; font-size: 20px; color: #111; }
  .info-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .label { font-weight: 600; color: #666; min-width: 120px; font-size: 13px; }
  .value { color: #111; font-size: 13px; }
  .btn { display: inline-block; margin-top: 24px; padding: 12px 28px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
  .footer { padding: 20px 32px; background: #f9f9f9; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style></head>
<body><div class="wrap">
  <div class="header"><span>lokal<em>online</em>.at</span></div>
  <div class="body">${content}</div>
  <div class="footer">lokalonline.at — Webdesign für Wiener Betriebe</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();

    // Supabase Webhook sends: { type, table, record, old_record }
    // type field can also be passed manually for direct calls
    const record = body.record;
    const table  = body.table;
    const type   = body.type || (table === 'orders' ? 'new-order' : table === 'messages' ? 'new-message' : null);

    // ── New order → notify admin ─────────────────────────────────────
    if (type === "new-order") {
      const o = record;
      const html = emailBase(`
        <h2>📋 Neue Bestellung eingegangen</h2>
        <div class="info-row"><span class="label">Betrieb</span><span class="value">${o.business_name || "—"}</span></div>
        <div class="info-row"><span class="label">Kontakt</span><span class="value">${o.contact_name || o.name || "—"}</span></div>
        <div class="info-row"><span class="label">E-Mail</span><span class="value">${o.email || "—"}</span></div>
        <div class="info-row"><span class="label">Telefon</span><span class="value">${o.phone || "—"}</span></div>
        <div class="info-row"><span class="label">Branche</span><span class="value">${o.business_type || "—"}</span></div>
        <div class="info-row"><span class="label">Adresse</span><span class="value">${o.address || "—"}</span></div>
        <p style="margin-top:16px;color:#666;font-size:13px">${o.description || ""}</p>
        <a class="btn" href="https://lokalonline.at/admin/">Im Dashboard ansehen →</a>
      `);
      const ok = await sendEmail(ADMIN_EMAIL, `Neue Bestellung: ${o.business_name || o.email}`, html);
      return json({ ok });
    }

    // ── New message → notify recipient ───────────────────────────────
    if (type === "new-message") {
      const m = record;
      const isFromClient = m.sender_type === "client";

      if (isFromClient) {
        // Client sent message → notify admin
        const html = emailBase(`
          <h2>💬 Neue Nachricht von Kunde</h2>
          <div class="info-row"><span class="label">Von</span><span class="value">${m.sender_name || "Kunde"}</span></div>
          <div class="info-row"><span class="label">Nachricht</span><span class="value">${m.content || "(Dateianhang)"}</span></div>
          ${m.attachment_url ? `<div class="info-row"><span class="label">Anhang</span><span class="value"><a href="${m.attachment_url}">${m.attachment_name || "Datei öffnen"}</a></span></div>` : ""}
          <a class="btn" href="https://lokalonline.at/admin/">Im Dashboard ansehen →</a>
        `);
        const ok = await sendEmail(ADMIN_EMAIL, `Neue Nachricht von ${m.sender_name || "Kunde"}`, html);
        return json({ ok });

      } else {
        // Admin sent message → notify client (need their email from orders table)
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
        const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

        const orderRes = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${m.order_id}&select=email,business_name`,
          { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
        );
        const orders = await orderRes.json();
        const order = orders[0];
        if (!order?.email) return json({ ok: false, error: "Order email not found" });

        const html = emailBase(`
          <h2>💬 Neue Nachricht von lokalonline.at</h2>
          <p>Sie haben eine neue Nachricht bezüglich Ihrer Website erhalten.</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#333">
            ${m.content || "(Dateianhang)"}
          </div>
          ${m.attachment_url ? `<p><a href="${m.attachment_url}">📎 ${m.attachment_name || "Anhang öffnen"}</a></p>` : ""}
          <a class="btn" href="https://lokalonline.at/portal/">Im Portal ansehen →</a>
        `);
        const ok = await sendEmail(order.email, "Neue Nachricht von lokalonline.at", html);
        return json({ ok });
      }
    }

    return json({ error: "Unknown type" }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
