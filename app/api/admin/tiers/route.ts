import { NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { listTiers } from "@/lib/db/tiers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireWcnAdmin();
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("includeArchived") === "1";
  const tiers = await listTiers({ includeArchived });
  return NextResponse.json({ tiers });
}
