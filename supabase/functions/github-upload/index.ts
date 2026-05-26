import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GITHUB_TOKEN  = Deno.env.get("GITHUB_TOKEN")!;
const GITHUB_REPO   = "snowsiro/Lokalonline";
const GITHUB_BRANCH = "main";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { action, path, content, message } = await req.json();

    if (action === "get-sha") {
      const r = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
      );
      if (r.status === 404) return json({ sha: null });
      const d = await r.json();
      return json({ sha: d.sha ?? null });
    }

    if (action === "put-file") {
      // Get current SHA first
      const shaRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
        { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
      );
      const shaData = shaRes.status === 404 ? null : await shaRes.json();
      const sha = shaData?.sha ?? undefined;

      const body: Record<string, unknown> = { message, content, branch: GITHUB_BRANCH };
      if (sha) body.sha = sha;

      const r = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      const d = await r.json();
      return json({ ok: r.ok, url: `https://lokalonline.at/${path}` });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
