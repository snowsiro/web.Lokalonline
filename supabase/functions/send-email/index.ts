import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const ADMIN_EMAIL    = "info@lokalonline.at";
const FROM_EMAIL     = "lokalonline.at <noreply@lokalonline.at>";
const SUPABASE_URL_AUTH  = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY  = Deno.env.get("SUPABASE_ANON_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin":  "https://lokalonline.at",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// Verify the request carries a valid JWT belonging to the admin account.
async function isAdmin(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const r = await fetch(`${SUPABASE_URL_AUTH}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return false;
  const user = await r.json().catch(() => null);
  return user?.email === ADMIN_EMAIL;
}

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
    // Supabase Webhooks send type="INSERT"/"UPDATE"/"DELETE" — derive notification type from table
    const isWebhookEvent = ['INSERT', 'UPDATE', 'DELETE'].includes(body.type);
    const type = isWebhookEvent
      ? (table === 'orders' && body.type === 'INSERT' ? 'new-order'
       : table === 'orders' && body.type === 'UPDATE' ? 'order-update'
       : (table === 'messages' && body.type === 'INSERT') ? 'new-message' : null)
      : body.type;

    // ── New order → notify admin + confirm to customer ───────────────
    if (type === "new-order") {
      const o = record;

      // 1. Admin notification
      const adminHtml = emailBase(`
        <h2>📋 Neue Bestellung eingegangen</h2>
        <div class="info-row"><span class="label">Betrieb</span><span class="value">${esc(o.business_name) || "—"}</span></div>
        <div class="info-row"><span class="label">Kontakt</span><span class="value">${esc(o.contact_name || o.name) || "—"}</span></div>
        <div class="info-row"><span class="label">E-Mail</span><span class="value">${esc(o.email) || "—"}</span></div>
        <div class="info-row"><span class="label">Telefon</span><span class="value">${esc(o.phone) || "—"}</span></div>
        <div class="info-row"><span class="label">Branche</span><span class="value">${esc(o.business_type) || "—"}</span></div>
        <div class="info-row"><span class="label">Adresse</span><span class="value">${esc(o.address) || "—"}</span></div>
        <p style="margin-top:16px;color:#666;font-size:13px">${esc(o.description)}</p>
        <a class="btn" href="https://lokalonline.at/admin/">Im Dashboard ansehen →</a>
      `);
      await sendEmail(ADMIN_EMAIL, `Neue Bestellung: ${o.business_name || o.email}`, adminHtml);

      // 2. Customer confirmation
      if (o.email) {
        const customerHtml = emailBase(`
          <h2>✅ Ihre Anfrage ist bei uns eingegangen!</h2>
          <p>Hallo ${esc(o.contact_name)},</p>
          <p>vielen Dank für Ihre Anfrage. Wir haben Ihre Bestellung erhalten und melden uns <strong>innerhalb von 24 Stunden</strong> bei Ihnen.</p>
          <div class="info-row"><span class="label">Betrieb</span><span class="value">${esc(o.business_name) || "—"}</span></div>
          <div class="info-row"><span class="label">Branche</span><span class="value">${esc(o.business_type) || "—"}</span></div>
          <div class="info-row"><span class="label">Adresse</span><span class="value">${esc(o.address) || "—"}</span></div>
          <p style="margin-top:20px;color:#666;font-size:13px">Bei Fragen können Sie uns jederzeit unter <a href="mailto:info@lokalonline.at" style="color:#C8302A">info@lokalonline.at</a> erreichen.</p>
          <a class="btn" href="https://lokalonline.at/portal/">Bestellstatus ansehen →</a>
        `);
        await sendEmail(o.email, "Ihre Anfrage bei lokalonline.at — Bestätigung", customerHtml);
      }

      return json({ ok: true });
    }

    // ── Order status → "done": notify customer ───────────────────────
    if (type === "order-update") {
      const o = record;
      const old = body.old_record;
      // Only fire when payment_status changes to "done"
      if (o.payment_status !== 'done' || old?.payment_status === 'done') {
        return json({ ok: true, skipped: true });
      }
      if (!o.email) return json({ ok: false, error: "No customer email" });

      const html = emailBase(`
        <h2>🎉 Ihre Website ist fertig!</h2>
        <p>Hallo ${esc(o.contact_name)},</p>
        <p>großartige Neuigkeiten — Ihre Website für <strong>${esc(o.business_name)}</strong> ist jetzt live und einsatzbereit!</p>
        ${o.site_slug ? `
        <div style="margin:24px 0">
          <div class="info-row"><span class="label">Website</span><span class="value"><a href="https://lokalonline.at/${o.site_slug}/" style="color:#C8302A">lokalonline.at/${o.site_slug}/</a></span></div>
          <div class="info-row"><span class="label">Speisekarte</span><span class="value"><a href="https://lokalonline.at/${o.site_slug}/menu/" style="color:#C8302A">lokalonline.at/${o.site_slug}/menu/</a></span></div>
          <div class="info-row"><span class="label">Linkseite</span><span class="value"><a href="https://lokalonline.at/${o.site_slug}/link/" style="color:#C8302A">lokalonline.at/${o.site_slug}/link/</a></span></div>
        </div>` : ""}
        <p style="color:#666;font-size:13px">Bei Fragen oder Änderungswünschen stehen wir Ihnen jederzeit zur Verfügung.</p>
        <a class="btn" href="https://lokalonline.at/portal/">Im Kundenportal ansehen →</a>
      `);
      const ok = await sendEmail(o.email, `Ihre Website ist live — ${o.business_name || "lokalonline.at"}`, html);
      return json({ ok });
    }

    // ── New message → notify recipient ───────────────────────────────
    if (type === "new-message") {
      const m = record;
      const isFromClient = m.sender_type === "client";

      if (isFromClient) {
        // Client sent message → notify admin
        const safeAtt = /^https:\/\//.test(m.attachment_url || "") ? m.attachment_url : "";
        const html = emailBase(`
          <h2>💬 Neue Nachricht von Kunde</h2>
          <div class="info-row"><span class="label">Von</span><span class="value">${esc(m.sender_name) || "Kunde"}</span></div>
          <div class="info-row"><span class="label">Nachricht</span><span class="value">${esc(m.content) || "(Dateianhang)"}</span></div>
          ${safeAtt ? `<div class="info-row"><span class="label">Anhang</span><span class="value"><a href="${esc(safeAtt)}">${esc(m.attachment_name) || "Datei öffnen"}</a></span></div>` : ""}
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
            ${esc(m.content) || "(Dateianhang)"}
          </div>
          ${/^https:\/\//.test(m.attachment_url || "") ? `<p><a href="${esc(m.attachment_url)}">📎 ${esc(m.attachment_name) || "Anhang öffnen"}</a></p>` : ""}
          <a class="btn" href="https://lokalonline.at/portal/">Im Portal ansehen →</a>
        `);
        const ok = await sendEmail(order.email, "Neue Nachricht von lokalonline.at", html);
        return json({ ok });
      }
    }

    // ── Payment link → send to customer (admin only) ─────────────────
    if (type === "payment-link") {
      if (!(await isAdmin(req))) return json({ error: "Unauthorized" }, 401);
      const { to, contact_name, business_name, payment_url } = body;
      if (!to || !payment_url) return json({ ok: false, error: "Missing to or payment_url" }, 400);
      if (!EMAIL_RE.test(to)) return json({ ok: false, error: "Invalid recipient" }, 400);
      if (!/^https:\/\//.test(payment_url)) return json({ ok: false, error: "Invalid payment_url" }, 400);

      const html = emailBase(`
        <h2>💳 Ihre Rechnung ist bereit</h2>
        <p>Hallo ${esc(contact_name)},</p>
        <p>Ihre Website für <strong>${esc(business_name)}</strong> ist fertig vorbereitet. Bitte schließen Sie jetzt die Zahlung ab, damit wir Ihren Auftritt freischalten können.</p>
        <div style="margin:24px 0;background:#f9f9f9;border-radius:8px;padding:20px;text-align:center">
          <p style="margin:0 0 4px;font-size:13px;color:#666">Monatlicher Betrag</p>
          <p style="margin:0 0 16px;font-size:28px;font-weight:700;color:#111">€19 / Monat</p>
          <a class="btn" href="${payment_url}" style="display:inline-block">Jetzt bezahlen →</a>
        </div>
        <p style="color:#666;font-size:13px">Keine Einrichtungsgebühr · Jederzeit kündbar · Bei Fragen: <a href="mailto:info@lokalonline.at" style="color:#C8302A">info@lokalonline.at</a></p>
        <p style="color:#999;font-size:12px;margin-top:8px">Mit der Zahlung kommt der Vertrag zustande. Es gelten unsere <a href="https://lokalonline.at/agb.html" style="color:#999">AGB</a> und die <a href="https://lokalonline.at/agb.html#widerruf" style="color:#999">Widerrufsbelehrung</a>.</p>
      `);
      const ok = await sendEmail(to, `Zahlungslink für Ihre Website — ${business_name || "lokalonline.at"}`, html);
      return json({ ok });
    }

    return json({ error: "Unknown type" }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
