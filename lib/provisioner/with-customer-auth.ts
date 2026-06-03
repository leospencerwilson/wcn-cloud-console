import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProvisionerHttpError } from "./apps-client";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const TOKEN_PREFIX = "wcn_";

// Authorization model: a console session (wcn_admin or customer_admin) drives
// the dashboard UI. For headless / CI traffic we also accept a customer API
// token via `Authorization: Bearer wcn_sk_*`, validated against the
// provisioner's /tokens/validate endpoint. Scope strings on individual routes
// gate token traffic; console sessions bypass scope checks (admin role).

export interface CustomerAuthCtx<P> {
  params: P;
  slug: string;
  userId: string;
  userEmail: string;
  role: "wcn_admin" | "customer_admin";
  /** When the request was authenticated by an API token, this carries the
   *  token's scopes. Empty for console-session requests. */
  scopes: string[];
  /** "session" for cookie-auth, "token" for Bearer wcn_sk_* */
  authMode: "session" | "token";
}

type Handler<P> = (
  req: NextRequest,
  ctx: CustomerAuthCtx<P>,
) => Promise<Response> | Response;

interface WithCustomerAuthOptions {
  /** Required scope for token requests, e.g. "vms:read", "apps:write".
   *  Token must declare a matching scope (resource + level), or a higher
   *  level on the same resource. Console sessions bypass this check. */
  scope?: string;
}

function parseScope(s: string): { resource: string; level: string } | null {
  const m = /^([a-z]+):(read|write|admin)$/.exec(s);
  if (!m) return null;
  return { resource: m[1], level: m[2] };
}

// "write" implies read; "admin" implies write + read.
function scopeSatisfies(have: string, want: string): boolean {
  const h = parseScope(have);
  const w = parseScope(want);
  if (!h || !w) return false;
  if (h.resource !== w.resource) return false;
  const order = { read: 0, write: 1, admin: 2 } as const;
  return order[h.level as keyof typeof order] >= order[w.level as keyof typeof order];
}

async function validateToken(token: string): Promise<{
  customer_slug: string;
  user_email: string;
  scopes: string[];
  token_id: number;
} | null> {
  const base = (process.env.PROVISIONER_BASE_URL || "").replace(/\/+$/, "");
  const provisionerToken = process.env.PROVISIONER_TOKEN;
  if (!base || !provisionerToken) {
    console.error("[withCustomerAuth] PROVISIONER_BASE_URL or PROVISIONER_TOKEN not set");
    return null;
  }
  try {
    const res = await fetch(`${base}/tokens/validate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${provisionerToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      customer_slug: string;
      user_email: string;
      scopes: string[];
      token_id: number;
    };
  } catch (e) {
    console.error("[withCustomerAuth] token validate threw", e);
    return null;
  }
}

export function withCustomerAuth<P extends { slug: string }>(
  handler: Handler<P>,
  options: WithCustomerAuthOptions = {},
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response> {
  return async (req, { params }) => {
    const resolved = await params;
    const slug = resolved.slug;

    // ── Try console session first ─────────────────────────────────
    const session = await getSession();
    if (session) {
      const { appUser } = session;
      const allowed =
        appUser.role === "wcn_admin" ||
        appUser.customer_slug === slug ||
        (session.impersonating?.customer_slug === slug);
      if (!allowed) {
        return NextResponse.json(
          { error: "Forbidden", code: "no_membership" },
          { status: 403 },
        );
      }
      if (session.impersonating && !SAFE_METHODS.has(req.method)) {
        return NextResponse.json(
          {
            error: "Mutations are disabled while impersonating.",
            code: "impersonate_read_only",
          },
          { status: 403 },
        );
      }
      return await invokeHandler(handler, req, {
        params: resolved,
        slug,
        userId: appUser.id,
        userEmail: appUser.email,
        role: appUser.role,
        scopes: [],
        authMode: "session",
      });
    }

    // ── Fall back to Authorization: Bearer wcn_sk_* ───────────────
    const authHeader = req.headers.get("authorization") || "";
    const bearer = /^Bearer\s+(\S+)$/i.exec(authHeader);
    if (bearer && bearer[1].startsWith(TOKEN_PREFIX)) {
      const validated = await validateToken(bearer[1]);
      if (!validated) {
        return NextResponse.json(
          { error: "Invalid or expired token", code: "invalid_token" },
          { status: 401 },
        );
      }
      if (validated.customer_slug !== slug) {
        return NextResponse.json(
          { error: "Token does not grant access to this customer", code: "wrong_customer" },
          { status: 403 },
        );
      }
      if (options.scope) {
        const ok = validated.scopes.some((s) => scopeSatisfies(s, options.scope!));
        if (!ok) {
          return NextResponse.json(
            { error: `Token missing required scope: ${options.scope}`, code: "missing_scope" },
            { status: 403 },
          );
        }
      }
      return await invokeHandler(handler, req, {
        params: resolved,
        slug,
        userId: `token:${validated.token_id}`,
        userEmail: validated.user_email,
        role: "customer_admin",
        scopes: validated.scopes,
        authMode: "token",
      });
    }

    // ── No session, no token ──────────────────────────────────────
    return NextResponse.json(
      { error: "Unauthenticated", code: "no_session" },
      { status: 401 },
    );
  };
}

async function invokeHandler<P extends { slug: string }>(
  handler: Handler<P>,
  req: NextRequest,
  ctx: CustomerAuthCtx<P>,
): Promise<Response> {
  try {
    return await handler(req, ctx);
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("[withCustomerAuth] handler threw", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: message, code: "internal_error" },
      { status: 500 },
    );
  }
}
