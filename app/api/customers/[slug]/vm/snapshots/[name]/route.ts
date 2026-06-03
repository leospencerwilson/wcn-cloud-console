import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; name: string };

export const DELETE = withCustomerAuth<Params>(async (_req, { params, slug, userEmail }) => {
  const result = await provisionerVms.snapshots.remove(slug, params.name, userEmail);
  return NextResponse.json(result, { status: 202 });
}, { scope: "backups:write" });
