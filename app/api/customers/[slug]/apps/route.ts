import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import type { AppCreateInput } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const apps = await provisionerApps.apps.list(slug);
  return NextResponse.json(apps);
});

export const POST = withCustomerAuth<{ slug: string }>(async (req: NextRequest, { slug }) => {
  const body = (await req.json()) as AppCreateInput;
  const app = await provisionerApps.apps.create(slug, body);
  return NextResponse.json(app, { status: 201 });
});
