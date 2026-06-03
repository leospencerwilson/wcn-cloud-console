import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string; rid: string };

export const DELETE = withCustomerAuth<Params>(async (_req, { params, userEmail, slug }) => {
  const rid = Number(params.rid);
  if (!Number.isFinite(rid)) {
    return NextResponse.json(
      { error: "invalid redirect id", code: "bad_request" },
      { status: 400 },
    );
  }
  const result = await provisionerApps.redirects.remove(params.id, rid, userEmail, slug);
  return NextResponse.json(result);
}, { scope: "apps:write" });
