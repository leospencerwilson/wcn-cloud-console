import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import type { EnvVar } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const env = await provisionerApps.env.get(params.id, slug);
  return NextResponse.json(env);
});

export const PUT = withCustomerAuth<Params>(async (req: NextRequest, { params, slug }) => {
  const body = (await req.json()) as EnvVar[];
  const env = await provisionerApps.env.put(params.id, body, slug);
  return NextResponse.json(env);
});
