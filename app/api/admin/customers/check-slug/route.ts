import { NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const slugRegex = /^[a-z0-9-]{2,40}$/;

export async function GET(request: Request) {
  await requireWcnAdmin();
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") ?? "").trim();
  if (!slugRegex.test(slug)) {
    return NextResponse.json({ available: false, invalid: true });
  }
  const existing = await getCustomer(slug);
  return NextResponse.json({ available: !existing });
}
