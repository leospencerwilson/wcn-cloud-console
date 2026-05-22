import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const power = await provisionerVms.power(slug);
  return NextResponse.json(power);
});
