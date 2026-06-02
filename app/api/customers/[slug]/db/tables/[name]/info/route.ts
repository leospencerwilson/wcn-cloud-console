import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string; name: string }>(async (_req, { slug, params }) => {
  return NextResponse.json(await provisionerSupabase.tableInfo(slug, params.name));
});
