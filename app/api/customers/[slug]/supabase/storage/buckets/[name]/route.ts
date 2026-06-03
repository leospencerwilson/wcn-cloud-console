import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type P = { slug: string; name: string };

export const DELETE = withCustomerAuth<P>(async (_req, { slug, params }) => {
  return NextResponse.json(await provisionerSupabase.storageDeleteBucket(slug, params.name));
}, { scope: "vms:write" });
