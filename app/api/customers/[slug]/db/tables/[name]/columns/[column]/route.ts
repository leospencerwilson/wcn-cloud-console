import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { AlterColumnInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withCustomerAuth<{ slug: string; name: string; column: string }>(
  async (req, { slug, params }) => {
    const body = (await req.json().catch(() => ({}))) as AlterColumnInput;
    return NextResponse.json(await provisionerSupabase.alterColumn(slug, params.name, params.column, body));
  }, { scope: "vms:write" });

export const DELETE = withCustomerAuth<{ slug: string; name: string; column: string }>(
  async (_req, { slug, params }) => {
    return NextResponse.json(await provisionerSupabase.dropColumn(slug, params.name, params.column));
  }, { scope: "vms:write" });
