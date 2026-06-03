import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerDb } from "@/lib/provisioner/db-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const sizes = await provisionerDb.sizes(slug);
  return NextResponse.json(sizes);
}, { scope: "vms:read" });
