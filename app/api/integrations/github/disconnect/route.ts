import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { disconnectIntegration, getIntegrationWithToken } from "@/lib/db/github-integration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/integrations/github/disconnect?slug=…
// Calls GitHub to revoke the OAuth grant (best-effort) and flips the
// integration row to disconnected_at = now(). The user's GitHub account is
// unaffected — they just need to reconnect to expose repos again.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }
  const slug = req.nextUrl.searchParams.get("slug") || session.appUser.customer_slug;
  if (!slug) {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }
  if (
    session.appUser.role !== "wcn_admin" &&
    session.appUser.customer_slug !== slug
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Best-effort revoke. GitHub's grant-revocation endpoint needs the OAuth
  // App's client_id + secret (Basic auth) — if either is missing we still
  // disconnect locally so the row is no longer used.
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const integ = await getIntegrationWithToken(slug);
  if (integ && clientId && clientSecret) {
    try {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      await fetch(`https://api.github.com/applications/${clientId}/grant`, {
        method: "DELETE",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Basic ${basic}`,
          "content-type": "application/json",
          "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({ access_token: integ.access_token }),
      });
    } catch (e) {
      console.warn("[gh disconnect] GitHub revoke failed (continuing):", e);
    }
  }

  await disconnectIntegration(slug);
  return NextResponse.json({ ok: true });
}
