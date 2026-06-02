import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerDb } from "@/lib/provisioner/db-client";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { CreateTableInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const tables = await provisionerDb.tables(slug);
  return NextResponse.json(tables);
});

export const POST = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const body = (await req.json().catch(() => ({}))) as CreateTableInput;
  return NextResponse.json(await provisionerSupabase.createTable(slug, body), { status: 201 });
});
