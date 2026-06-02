import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";
import type { BucketCreateInput } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  return NextResponse.json(await provisionerSupabase.storageBuckets(slug));
});

export const POST = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const body = (await req.json().catch(() => ({}))) as BucketCreateInput;
  const bucket = await provisionerSupabase.storageCreateBucket(slug, body);
  return NextResponse.json(bucket, { status: 201 });
});
