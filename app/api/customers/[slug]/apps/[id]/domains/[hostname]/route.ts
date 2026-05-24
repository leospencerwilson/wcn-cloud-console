import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string; hostname: string };

export const GET = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const hostname = decodeURIComponent(params.hostname);
  const domain = await provisionerApps.domains.status(params.id, hostname, slug);
  return NextResponse.json(domain);
});

export const DELETE = withCustomerAuth<Params>(async (_req, { params, userEmail, slug }) => {
  const hostname = decodeURIComponent(params.hostname);
  await provisionerApps.domains.remove(params.id, hostname, userEmail, slug);
  return NextResponse.json({ ok: true });
});
