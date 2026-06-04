import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerDns } from "@/lib/provisioner/dns-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export const GET = withCustomerAuth<Params>(async (_req, { slug, params }) => {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "invalid id", code: "bad_request" }, { status: 400 });
  }
  const row = await provisionerDns.get(slug, params.id);
  return NextResponse.json(row);
}, { scope: "domains:read" });

export const DELETE = withCustomerAuth<Params>(async (_req, { slug, params, userEmail }) => {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "invalid id", code: "bad_request" }, { status: 400 });
  }
  const r = await provisionerDns.remove(slug, params.id, userEmail);
  return NextResponse.json(r);
}, { scope: "domains:admin" });
