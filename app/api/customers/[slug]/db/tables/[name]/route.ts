import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { AlterTableInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, name }) => {
  const body = (await req.json().catch(() => ({}))) as AlterTableInput;
  return NextResponse.json(await provisionerSupabase.alterTable(slug, name, body));
});

export const DELETE = withCustomerAuth<{ slug: string; name: string }>(async (_req, { slug, name }) => {
  return NextResponse.json(await provisionerSupabase.dropTable(slug, name));
});
