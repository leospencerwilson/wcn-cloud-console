import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { getCustomerRole } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

export const GET = withCustomerAuth<Params>(async (_req, { slug }) => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  const role = await getCustomerRole(session, slug);
  return NextResponse.json({ role });
});
