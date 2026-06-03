import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerDb } from "@/lib/provisioner/db-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export const GET = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const schema = req.nextUrl.searchParams.get("schema") || "public";
  const table = req.nextUrl.searchParams.get("table") || "";
  if (!IDENT_RE.test(schema) || !IDENT_RE.test(table)) {
    return NextResponse.json({ error: "invalid schema or table", code: "bad_request" }, { status: 400 });
  }
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50, 500);
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0, 0);
  const data = await provisionerDb.rows(slug, schema, table, limit, offset);
  return NextResponse.json(data);
}, { scope: "vms:read" });
