import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerTeam } from "@/lib/provisioner/team-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

export const GET = withCustomerAuth<Params>(async (_req, { slug }) => {
  const members = await provisionerTeam.list(slug);
  return NextResponse.json(members);
});
