import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { AlterColumnInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withCustomerAuth<{ slug: string; name: string; column: string }>(
  async (req, { slug, name, column }) => {
    const body = (await req.json().catch(() => ({}))) as AlterColumnInput;
    return NextResponse.json(await provisionerSupabase.alterColumn(slug, name, column, body));
  },
);

export const DELETE = withCustomerAuth<{ slug: string; name: string; column: string }>(
  async (_req, { slug, name, column }) => {
    return NextResponse.json(await provisionerSupabase.dropColumn(slug, name, column));
  },
);
