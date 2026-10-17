// Gives a logged-in operator or shop owner a one-time Cloudinary upload
// signature for a photo on their own menu (/{slug}/menu/). Who may edit which
// menu is decided by the database function can_edit_menu (supabase/menu_data.sql).

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const CLOUD_NAME        = "dxsrdx0cw";
const API_KEY           = Deno.env.get("CLOUDINARY_API_KEY") || "";
const API_SECRET        = Deno.env.get("CLOUDINARY_API_SECRET") || "";

const CORS = {
  "Access-Control-Allow-Origin":  "https://web.lokalonline.at",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// true / false, or null when the login itself is not valid.
async function canEditMenu(token: string, slug: string): Promise<boolean | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/can_edit_menu`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error("can_edit_menu failed (" + r.status + ")");
  return (await r.json()) === true;
}

// Cloudinary: SHA-1 of the "key=value" pairs sorted by key and joined with "&",
// directly followed by the API secret.
async function sign(params: Record<string, string>): Promise<string> {
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + API_SECRET;
  const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!API_KEY || !API_SECRET) return json({ error: "Cloudinary is not configured" }, 500);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  try {
    const { slug, item } = await req.json();
    if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) return json({ error: "Invalid slug" }, 400);
    if (typeof item !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(item)) return json({ error: "Invalid item" }, 400);

    const allowed = await canEditMenu(token, slug);
    if (allowed === null) return json({ error: "Unauthorized" }, 401);
    if (!allowed) return json({ error: "Forbidden" }, 403);

    // The page must send exactly these fields with the file. The photo lands in
    // menus/{slug}/ and is shrunk to at most 1600px before Cloudinary stores it.
    const params = {
      public_id:       `menus/${slug}/${item}_${Date.now()}`,
      timestamp:       String(Math.floor(Date.now() / 1000)),
      transformation:  "c_limit,w_1600,h_1600",
      allowed_formats: "jpg,png,webp,heic,avif",
    };
    return json({ ...params, cloud_name: CLOUD_NAME, api_key: API_KEY, signature: await sign(params) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
