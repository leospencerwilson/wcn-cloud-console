import { NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { provisionerVms } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await requireWcnAdmin();
  const data = await provisionerVms.voipSummary();
  return NextResponse.json(data);
}
