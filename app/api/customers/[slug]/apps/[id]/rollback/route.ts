import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params, slug }) => {
  const body = (await req.json().catch(() => ({}))) as { deployment_uuid?: string };
  if (!body.deployment_uuid) {
    return NextResponse.json(
      { error: "deployment_uuid required", code: "bad_request" },
      { status: 400 },
    );
  }
  const result = await provisionerApps.apps.rollback(params.id, body.deployment_uuid, slug);
  return NextResponse.json(result, { status: 202 });
}, { scope: "apps:write" });
