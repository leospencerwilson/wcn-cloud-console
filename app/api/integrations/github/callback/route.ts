import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { saveIntegration } from "@/lib/db/github-integration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface OAuthTokenResponse {
  access_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GithubUserResponse {
  id: number;
  login: string;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const ghError = req.nextUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const cookieState = cookieStore.get("wcn-gh-oauth-state")?.value;
  const slug = cookieStore.get("wcn-gh-oauth-slug")?.value;

  // Tidy up the one-shot cookies regardless of outcome.
  cookieStore.set("wcn-gh-oauth-state", "", { path: "/", maxAge: 0 });
  cookieStore.set("wcn-gh-oauth-slug", "", { path: "/", maxAge: 0 });

  function back(qs: string): Response {
    const target = slug ? `/dashboard/settings?${qs}` : `/dashboard?${qs}`;
    return NextResponse.redirect(new URL(target, req.url));
  }

  if (ghError) return back(`gh_error=${encodeURIComponent(ghError)}`);
  if (!code || !state) return back("gh_error=missing_code_or_state");
  if (!cookieState || state !== cookieState) return back("gh_error=state_mismatch");
  if (!slug) return back("gh_error=no_slug_cookie");
  if (
    session.appUser.role !== "wcn_admin" &&
    session.appUser.customer_slug !== slug
  ) {
    return back("gh_error=forbidden");
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return back("gh_error=not_configured");

  // Exchange the code for a token.
  let tok: OAuthTokenResponse;
  try {
    const r = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    tok = (await r.json()) as OAuthTokenResponse;
  } catch (e) {
    console.error("[gh callback] token exchange threw", e);
    return back("gh_error=exchange_failed");
  }
  if (!tok.access_token) {
    return back(`gh_error=${encodeURIComponent(tok.error || "no_access_token")}`);
  }

  // Look up the user so we can store github_user_id + login.
  let user: GithubUserResponse;
  try {
    const u = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${tok.access_token}`,
        "x-github-api-version": "2022-11-28",
      },
    });
    if (!u.ok) return back(`gh_error=user_lookup_${u.status}`);
    user = (await u.json()) as GithubUserResponse;
  } catch (e) {
    console.error("[gh callback] /user threw", e);
    return back("gh_error=user_lookup_failed");
  }

  try {
    await saveIntegration({
      customer_slug: slug,
      github_user_id: user.id,
      github_login: user.login,
      access_token: tok.access_token,
      scopes: (tok.scope || "").split(",").map((s) => s.trim()).filter(Boolean),
      connected_by_email: session.appUser.email,
    });
  } catch (e) {
    console.error("[gh callback] saveIntegration threw", e);
    return back("gh_error=db_write_failed");
  }

  return back(`gh_connected=${encodeURIComponent(user.login)}`);
}
