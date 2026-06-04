import { NextResponse } from "next/server";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerDns } from "@/lib/provisioner/dns-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Static metadata about the DNS providers we support. Cached upstream
// in the provisioner module so this is essentially free to hit.
export async function GET() {
  await requireCustomerAdmin();
  const meta = await provisionerDns.providersMeta();
  return NextResponse.json(meta);
}
