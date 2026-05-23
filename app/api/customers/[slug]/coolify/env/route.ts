import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerCoolify } from "@/lib/provisioner/coolify-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const data = await provisionerCoolify.env(slug);
  return NextResponse.json(data);
});
