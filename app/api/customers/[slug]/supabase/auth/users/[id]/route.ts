import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { AuthUserUpdateInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type P = { slug: string; id: string };

export const PATCH = withCustomerAuth<P>(async (req, { slug, params }) => {
  const body = (await req.json().catch(() => ({}))) as AuthUserUpdateInput;
  const user = await provisionerSupabase.authUpdateUser(slug, params.id, body);
  return NextResponse.json(user);
});

export const DELETE = withCustomerAuth<P>(async (_req, { slug, params }) => {
  return NextResponse.json(await provisionerSupabase.authDeleteUser(slug, params.id));
});
