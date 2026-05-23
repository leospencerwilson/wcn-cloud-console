import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };
type Body = {
  text: string;
  is_build_time?: boolean;
  is_preview?: boolean;
  ignore_errors?: boolean;
};

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params }) => {
  const body = (await req.json()) as Body;
  const result = await provisionerApps.env.importText(params.id, body);
  return NextResponse.json(result);
});
