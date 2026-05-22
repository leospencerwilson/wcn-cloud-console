import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  clearImpersonateCookie,
  readImpersonate,
} from "@/lib/auth/impersonate";
import { notifyImpersonate } from "@/lib/provisioner/admin-impersonate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated", code: "no_session" }, { status: 401 });
  }
  if (session.appUser.role !== "wcn_admin") {
    return NextResponse.json({ error: "Forbidden", code: "not_admin" }, { status: 403 });
  }

  const current = await readImpersonate();
  await clearImpersonateCookie();

  if (current && current.customer_slug) {
    try {
      await notifyImpersonate(current.customer_slug, "stop", session.appUser.email);
    } catch (err) {
      console.error("[impersonate.stop] audit notify failed", err);
    }
    return NextResponse.json({ ok: true, customer_slug: current.customer_slug });
  }
  return NextResponse.json({ ok: true });
}
