import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerDns } from "@/lib/provisioner/dns-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

const UUID_RE = /^[0-9a-f-]{36}$/i;

export const POST = withCustomerAuth<Params>(async (_req, { slug, params }) => {
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "invalid id", code: "bad_request" }, { status: 400 });
  }
  const zones = await provisionerDns.refreshZones(slug, params.id);
  return NextResponse.json(zones);
}, { scope: "domains:read" });
