import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  setImpersonateCookie,
  signImpersonateToken,
} from "@/lib/auth/impersonate";
import { getCustomer } from "@/lib/db/customers";
import { notifyImpersonate } from "@/lib/provisioner/admin-impersonate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated", code: "no_session" }, { status: 401 });
  }
  if (session.appUser.role !== "wcn_admin") {
    return NextResponse.json({ error: "Forbidden", code: "not_admin" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    customer_slug?: string;
    note?: string;
  };
  const slug = (body.customer_slug || "").trim();
  if (!slug) {
    return NextResponse.json(
      { error: "customer_slug is required", code: "bad_request" },
      { status: 400 },
    );
  }
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : undefined;

  const customer = await getCustomer(slug);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found", code: "not_found" }, { status: 404 });
  }

  const started_at = new Date().toISOString();
  const jwt = await signImpersonateToken({
    admin_id: session.appUser.id,
    admin_email: session.appUser.email,
    customer_slug: slug,
    started_at,
    note,
  });
  await setImpersonateCookie(jwt);

  try {
    await notifyImpersonate(slug, "start", session.appUser.email, note);
  } catch (err) {
    console.error("[impersonate.start] audit notify failed", err);
    // Don't fail the whole call — the cookie is set; audit-side outage
    // shouldn't block engineer access.
  }

  return NextResponse.json({ ok: true, customer_slug: slug, started_at });
}
