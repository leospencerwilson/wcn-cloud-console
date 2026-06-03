import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type {
  RowInput,
  RowUpdateInput,
  RowDeleteInput,
} from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, params }) => {
  const body = (await req.json().catch(() => ({}))) as RowInput;
  return NextResponse.json(await provisionerSupabase.insertRow(slug, params.name, body), { status: 201 });
}, { scope: "vms:write" });

export const PATCH = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, params }) => {
  const body = (await req.json().catch(() => ({}))) as RowUpdateInput;
  return NextResponse.json(await provisionerSupabase.updateRow(slug, params.name, body));
}, { scope: "vms:write" });

export const DELETE = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, params }) => {
  const body = (await req.json().catch(() => ({}))) as RowDeleteInput;
  return NextResponse.json(await provisionerSupabase.deleteRow(slug, params.name, body));
}, { scope: "vms:write" });
