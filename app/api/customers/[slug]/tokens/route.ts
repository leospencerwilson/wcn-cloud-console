import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerTokens } from "@/lib/provisioner/tokens-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

const RESOURCES = ["vms", "apps", "backups", "domains", "secrets", "audit", "metrics"];
const LEVELS = ["read", "write", "admin"];
const SCOPE_RE = new RegExp(`^(${RESOURCES.join("|")}):(${LEVELS.join("|")})$`);

export const GET = withCustomerAuth<Params>(async (_req, { slug }) => {
  const tokens = await provisionerTokens.list(slug);
  return NextResponse.json(tokens);
}, { scope: "audit:admin" });

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { slug, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    scopes?: string[];
    expires_at?: string | null;
  };
  const name = (body.name || "").trim();
  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: "name must be 1–80 characters", code: "bad_request" },
      { status: 400 },
    );
  }
  const scopes = Array.isArray(body.scopes) ? body.scopes : [];
  if (scopes.length === 0) {
    return NextResponse.json(
      { error: "at least one scope is required", code: "bad_request" },
      { status: 400 },
    );
  }
  for (const s of scopes) {
    if (typeof s !== "string" || !SCOPE_RE.test(s)) {
      return NextResponse.json(
        { error: `invalid scope: ${s}`, code: "bad_request" },
        { status: 400 },
      );
    }
  }
  let expires_at: string | undefined;
  if (body.expires_at) {
    const d = new Date(body.expires_at);
    if (!Number.isFinite(d.getTime()) || d.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "expires_at must be a future ISO date", code: "bad_request" },
        { status: 400 },
      );
    }
    expires_at = d.toISOString();
  }
  const created = await provisionerTokens.create(
    slug,
    { name, scopes, expires_at: expires_at ?? null, user_email: userEmail },
    userEmail,
  );
  return NextResponse.json(created, { status: 201 });
}, { scope: "audit:admin" });
