import { type NextRequest, NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withCustomerAuth<{ slug: string }>(async (req: NextRequest, { slug }) => {
  const body = await req.json().catch(() => ({}));
  const base = (process.env.PROVISIONER_BASE_URL || "").replace(/\/+$/, "");
  const tok = process.env.PROVISIONER_TOKEN;
  const r = await fetch(`${base}/vms/${slug}/supabase/functions/deploy`, {
    method: "POST",
    headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return new NextResponse(text || "{}", { status: r.status, headers: { "content-type": "application/json" } });
}, { scope: "vms:write" });
