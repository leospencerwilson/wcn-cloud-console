import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCapacity } from "@/lib/provisioner/capacity-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthenticated", code: "no_session" },
      { status: 401 },
    );
  }
  if (session.appUser.role !== "wcn_admin") {
    return NextResponse.json(
      { error: "Forbidden", code: "not_admin" },
      { status: 403 },
    );
  }
  try {
    const report = await getCapacity();
    return NextResponse.json(report);
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
