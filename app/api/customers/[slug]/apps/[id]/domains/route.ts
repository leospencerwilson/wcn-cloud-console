import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (_req, { params }) => {
  const domains = await provisionerApps.domains.list(params.id);
  return NextResponse.json(domains);
});

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params }) => {
  const { hostname } = (await req.json()) as { hostname: string };
  if (!hostname || typeof hostname !== "string") {
    return NextResponse.json(
      { error: "hostname required", code: "bad_request" },
      { status: 400 },
    );
  }
  const domain = await provisionerApps.domains.add(params.id, hostname);
  return NextResponse.json(domain, { status: 201 });
});
