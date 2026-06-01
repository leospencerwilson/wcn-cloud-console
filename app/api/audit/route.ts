import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listAudit } from "@/lib/db/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || null;
  const isAdmin = session.appUser.role === "wcn_admin";

  if (!slug && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (slug && !isAdmin) {
    if (
      session.appUser.role !== "customer_admin" ||
      session.appUser.customer_slug !== slug
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const actor = url.searchParams.get("actor");
  const action = url.searchParams.get("action");
  const q = url.searchParams.get("q");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Number(url.searchParams.get("page") || "1");
  const limit = Number(url.searchParams.get("limit") || "25");
  const sortParam = url.searchParams.get("sort");
  const sort: "asc" | "desc" = sortParam === "asc" ? "asc" : "desc";

  const result = await listAudit({
    slug,
    actor,
    action,
    q,
    from: from ? new Date(from).toISOString() : null,
    to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 25,
    sort,
  });

  return NextResponse.json(result);
}
