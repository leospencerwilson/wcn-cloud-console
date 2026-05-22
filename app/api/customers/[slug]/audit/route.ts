import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerCustomers } from "@/lib/provisioner/customers-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

export const GET = withCustomerAuth<Params>(async (req: NextRequest, { slug }) => {
  const sp = req.nextUrl.searchParams;
  const limitRaw = Number(sp.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(limitRaw, 1000)
      : 200;
  const events = await provisionerCustomers.audit(slug, {
    since: sp.get("since") || undefined,
    until: sp.get("until") || undefined,
    action: sp.get("action") || undefined,
    limit,
  });
  return NextResponse.json(events);
});
