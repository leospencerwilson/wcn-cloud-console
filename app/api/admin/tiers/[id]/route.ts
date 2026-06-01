import { NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getTier } from "@/lib/db/tiers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireWcnAdmin();
  const { id } = await params;
  const tier = await getTier(id);
  if (!tier) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ tier });
}
