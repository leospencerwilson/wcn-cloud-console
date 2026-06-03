import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/integrations/github/start
// Starts the OAuth dance: sets a random `state` cookie + a `slug` cookie
// (so callback knows which customer to bind the token to) and redirects
// the browser to github.com/login/oauth/authorize.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
    return NextResponse.redirect(`https://console.${rootDomain}/login`);
  }

  // Only a customer_admin or a wcn_admin acting on behalf of a customer can
  // connect a GitHub integration. Pull the slug from the query (?slug=)
  // or fall back to the session's home slug.
  const reqSlug = req.nextUrl.searchParams.get("slug") || session.appUser.customer_slug;
  if (!reqSlug) {
    return NextResponse.json(
      { error: "slug required (no customer slug on session)", code: "missing_slug" },
      { status: 400 },
    );
  }
  if (
    session.appUser.role !== "wcn_admin" &&
    session.appUser.customer_slug !== reqSlug
  ) {
    return NextResponse.json(
      { error: "forbidden", code: "no_membership" },
      { status: 403 },
    );
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "GitHub integration is not configured (GITHUB_OAUTH_CLIENT_ID unset on the console).",
        code: "not_configured",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("wcn-gh-oauth-state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  cookieStore.set("wcn-gh-oauth-slug", reqSlug, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const redirectUri = `https://console.${rootDomain}/api/integrations/github/callback`;
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "repo read:user");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "false");

  return NextResponse.redirect(authorize.toString());
}
