import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GITHUB_TOKEN  = Deno.env.get("GITHUB_TOKEN") || "";
const GITHUB_REPO   = "snowsiro/Lokalonline";
const GITHUB_BRANCH = "main";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function putFile(path: string, base64Content: string, message: string) {
  const shaRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
  );
  const shaData = shaRes.status === 404 ? null : await shaRes.json();
  if (shaData && shaData.message && !shaData.sha) {
    throw new Error("GitHub auth error: " + shaData.message);
  }
  const sha = shaData ? shaData.sha : undefined;
  const body: Record<string, string> = { message, content: base64Content, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error("GitHub PUT failed (" + r.status + "): " + (errData.message || r.statusText));
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const { action } = body;

    // Upload a text/binary file by base64 content
    if (action === "put-file") {
      const ok = await putFile(body.path, body.content, body.message || "Update file");
      return json({ ok, url: `https://lokalonline.at/${body.path}` });
    }

    // Fetch a binary file from a URL and upload to GitHub
    if (action === "copy-from-url") {
      const imgRes = await fetch(body.source_url);
      if (!imgRes.ok) return json({ error: "Failed to fetch source: " + body.source_url }, 400);
      const buffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const ok = await putFile(body.dest_path, base64, body.message || "Upload image");
      return json({ ok, url: `https://lokalonline.at/${body.dest_path}` });
    }

    // Get file content from GitHub
    if (action === "get-file") {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${body.path}?ref=${GITHUB_BRANCH}`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
      );
      if (res.status === 404) return json({ error: "File not found" }, 404);
      const data = await res.json();
      const decoded = atob(data.content.replace(/\n/g, ""));
      return json({ content: decoded, sha: data.sha });
    }

    // Delete all files under a slug folder
    if (action === "delete-folder") {
      const slug = body.slug;
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) return json({ error: "Invalid slug" }, 400);
      const listRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${slug}?ref=${GITHUB_BRANCH}`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
      );
      if (listRes.status === 404) return json({ ok: true });
      const files = await listRes.json();
      if (!Array.isArray(files)) return json({ error: "Could not list folder" }, 500);
      for (const file of files) {
        if (file.type === "file") {
          await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${file.path}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Delete site: " + slug, sha: file.sha, branch: GITHUB_BRANCH })
          });
        }
      }
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});
