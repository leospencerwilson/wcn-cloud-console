import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withCustomerAuth<{ slug: string; job_id: string }>(async (_req: NextRequest, { slug, params }) => {
  const base = (process.env.PROVISIONER_BASE_URL || "").replace(/\/+$/, "");
  const tok = process.env.PROVISIONER_TOKEN;
  const r = await fetch(`${base}/vms/${slug}/migrate/cancel/${params.job_id}`, {
    method: "POST",
    headers: { authorization: `Bearer ${tok}`, "x-wcn-slug": slug },
  });
  const text = await r.text();
  return new NextResponse(text || "{}", { status: r.status, headers: { "content-type": "application/json" } });
}, { scope: "vms:write" });
