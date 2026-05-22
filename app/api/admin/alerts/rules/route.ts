import { NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { provisionerAlerts } from "@/lib/provisioner/alerts-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await requireWcnAdmin();
  try {
    const rules = await provisionerAlerts.rules();
    return NextResponse.json(rules);
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown", code: "internal_error" },
      { status: 500 },
    );
  }
}
