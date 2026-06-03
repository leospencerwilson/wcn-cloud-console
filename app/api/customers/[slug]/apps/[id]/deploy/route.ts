import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params, slug }) => {
  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const status = await provisionerApps.apps.deploy(params.id, body.force ?? false, slug);
  return NextResponse.json(status, { status: 202 });
}, { scope: "apps:write" });
