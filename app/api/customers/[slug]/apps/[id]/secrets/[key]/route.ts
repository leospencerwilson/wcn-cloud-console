import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string; key: string };

export const DELETE = withCustomerAuth<Params>(async (_req, { params, userEmail, slug }) => {
  const key = decodeURIComponent(params.key);
  const result = await provisionerApps.secrets.remove(params.id, key, userEmail, slug);
  return NextResponse.json(result);
});
