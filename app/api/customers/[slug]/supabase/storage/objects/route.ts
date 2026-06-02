import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(async (req, { slug }) => {
  const bucket = req.nextUrl.searchParams.get("bucket") || "";
  if (!bucket) {
    return NextResponse.json({ error: "bucket required", code: "missing_bucket" }, { status: 400 });
  }
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100", 10) || 100, 1000);
  const offset = Math.max(parseInt(req.nextUrl.searchParams.get("offset") || "0", 10) || 0, 0);
  return NextResponse.json(await provisionerSupabase.storageObjects(slug, bucket, limit, offset));
});
