import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { provisionerAlerts } from "@/lib/provisioner/alerts-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import type { AlertFiringStatus } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES = new Set<AlertFiringStatus>(["firing", "resolved"]);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated", code: "no_session" }, { status: 401 });
  }
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const slug = sp.get("slug");
  const since = sp.get("since") || undefined;
  const limitRaw = sp.get("limit");
  const limit = limitRaw ? Math.min(Math.max(Number(limitRaw) || 100, 1), 500) : 100;

  if (session.appUser.role !== "wcn_admin") {
    if (!slug || session.appUser.customer_slug !== slug) {
      return NextResponse.json({ error: "Forbidden", code: "no_membership" }, { status: 403 });
    }
  }

  try {
    const firings = await provisionerAlerts.firings({
      since,
      status: status && STATUSES.has(status as AlertFiringStatus)
        ? (status as AlertFiringStatus)
        : undefined,
      slug: slug || undefined,
      limit,
    });
    return NextResponse.json(firings);
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
