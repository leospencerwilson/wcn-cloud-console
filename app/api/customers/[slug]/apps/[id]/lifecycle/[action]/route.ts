import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set(["restart", "stop", "start"]);

type Params = { slug: string; id: string; action: string };

export const POST = withCustomerAuth<Params>(async (_req, { params }) => {
  if (!ALLOWED.has(params.action)) {
    return NextResponse.json(
      { error: `Unknown action "${params.action}"`, code: "invalid_action" },
      { status: 400 },
    );
  }
  const action = params.action as "restart" | "stop" | "start";
  const result = await provisionerApps.apps[action](params.id);
  return NextResponse.json(result);
});
