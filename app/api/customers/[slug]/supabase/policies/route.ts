import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { PolicyCreateInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  return NextResponse.json(await provisionerSupabase.policies(slug));
});

export const POST = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const body = (await req.json().catch(() => ({}))) as PolicyCreateInput;
  const result = await provisionerSupabase.policyCreate(slug, body);
  return NextResponse.json(result, { status: 201 });
});

export const DELETE = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const schema = req.nextUrl.searchParams.get("schema") || "";
  const table = req.nextUrl.searchParams.get("table") || "";
  const name = req.nextUrl.searchParams.get("name") || "";
  if (!schema || !table || !name) {
    return NextResponse.json({ error: "schema, table, name required", code: "missing_params" }, { status: 400 });
  }
  return NextResponse.json(await provisionerSupabase.policyDelete(slug, schema, table, name));
});
