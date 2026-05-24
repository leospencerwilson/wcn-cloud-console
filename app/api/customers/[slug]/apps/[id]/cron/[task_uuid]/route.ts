import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string; task_uuid: string };

export const DELETE = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const result = await provisionerApps.cron.remove(params.id, params.task_uuid, slug);
  return NextResponse.json(result);
});
