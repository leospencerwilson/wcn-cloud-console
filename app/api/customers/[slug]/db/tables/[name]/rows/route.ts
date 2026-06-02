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

export const POST = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, name }) => {
  const body = (await req.json().catch(() => ({}))) as RowInput;
  return NextResponse.json(await provisionerSupabase.insertRow(slug, name, body), { status: 201 });
});

export const PATCH = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, name }) => {
  const body = (await req.json().catch(() => ({}))) as RowUpdateInput;
  return NextResponse.json(await provisionerSupabase.updateRow(slug, name, body));
});

export const DELETE = withCustomerAuth<{ slug: string; name: string }>(async (req, { slug, name }) => {
  const body = (await req.json().catch(() => ({}))) as RowDeleteInput;
  return NextResponse.json(await provisionerSupabase.deleteRow(slug, name, body));
});
