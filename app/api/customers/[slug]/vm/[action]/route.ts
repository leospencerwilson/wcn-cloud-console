import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms, type VmAction } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: ReadonlySet<VmAction> = new Set(["restart", "stop", "start"]);

type Params = { slug: string; action: string };

export const POST = withCustomerAuth<Params>(async (_req, { slug, params, userEmail }) => {
  if (!ALLOWED.has(params.action as VmAction)) {
    return NextResponse.json(
      { error: `Unknown action "${params.action}"`, code: "invalid_action" },
      { status: 400 },
    );
  }
  const result = await provisionerVms.action(slug, params.action as VmAction, userEmail);
  return NextResponse.json(result, { status: 202 });
});
