import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import type { AppCreateInput } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const app = await provisionerApps.apps.get(params.id, slug);
  return NextResponse.json(app);
});

export const PATCH = withCustomerAuth<Params>(async (req: NextRequest, { params }) => {
  const body = (await req.json()) as Partial<AppCreateInput>;
  const app = await provisionerApps.apps.patch(params.id, body);
  return NextResponse.json(app);
});

export const DELETE = withCustomerAuth<Params>(async (_req, { params }) => {
  await provisionerApps.apps.delete(params.id);
  return NextResponse.json({ ok: true });
});
