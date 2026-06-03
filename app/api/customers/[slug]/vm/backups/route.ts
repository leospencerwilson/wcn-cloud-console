import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

export const GET = withCustomerAuth<Params>(async (_req, { slug }) => {
  const backups = await provisionerVms.backups.list(slug);
  return NextResponse.json(backups);
}, { scope: "backups:read" });

export const POST = withCustomerAuth<Params>(async (_req, { slug, userEmail }) => {
  const result = await provisionerVms.backups.trigger(slug, userEmail);
  return NextResponse.json(result, { status: 202 });
}, { scope: "backups:write" });
