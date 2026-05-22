import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProvisionerHttpError } from "./apps-client";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Authorization model: a wcn_admin can act on any slug; a customer_admin
// can only act on their own slug (appUser.customer_slug). Unauthenticated
// → 401; authenticated-but-wrong-slug → 403.

export interface CustomerAuthCtx<P> {
  params: P;
  slug: string;
  userId: string;
  userEmail: string;
  role: "wcn_admin" | "customer_admin";
}

type Handler<P> = (
  req: NextRequest,
  ctx: CustomerAuthCtx<P>,
) => Promise<Response> | Response;

export function withCustomerAuth<P extends { slug: string }>(
  handler: Handler<P>,
): (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response> {
  return async (req, { params }) => {
    const resolved = await params;
    const slug = resolved.slug;

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthenticated", code: "no_session" },
        { status: 401 },
      );
    }

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

    try {
      return await handler(req, {
        params: resolved,
        slug,
        userId: appUser.id,
        userEmail: appUser.email,
        role: appUser.role,
      });
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
  };
}
