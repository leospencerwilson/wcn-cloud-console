import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { ColumnInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, params }) => {
  const body = (await req.json().catch(() => ({}))) as ColumnInput;
  return NextResponse.json(await provisionerSupabase.addColumn(slug, params.name, body), { status: 201 });
}, { scope: "vms:write" });
