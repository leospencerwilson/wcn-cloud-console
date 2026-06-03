import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { AuthUserCreateInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50, 500);
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0, 0);
  return NextResponse.json(await provisionerSupabase.authUsers(slug, limit, offset));
}, { scope: "vms:read" });

export const POST = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const body = (await req.json().catch(() => ({}))) as AuthUserCreateInput;
  const user = await provisionerSupabase.authCreateUser(slug, body);
  return NextResponse.json(user, { status: 201 });
}, { scope: "vms:write" });
