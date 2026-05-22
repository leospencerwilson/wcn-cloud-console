import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import { proxySse } from "@/lib/provisioner/sse-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (req: NextRequest, { params, slug }) => {
  const follow = req.nextUrl.searchParams.get("follow");
  if (follow === "1" || follow === "true") {
    const tailParam = req.nextUrl.searchParams.get("tail");
    const tail = Math.min(Math.max(Number(tailParam) || 200, 1), 5000);
    return proxySse({
      path: `/apps/${params.id}/logs?follow=1&tail=${tail}`,
      slug,
      signal: req.signal,
    });
  }
  const tailParam = req.nextUrl.searchParams.get("tail");
  const tail = Math.min(Math.max(Number(tailParam) || 200, 1), 5000);
  const logs = await provisionerApps.apps.logs(params.id, tail);
  return NextResponse.json(logs);
});
