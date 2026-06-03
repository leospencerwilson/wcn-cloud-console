import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface DeployedFn { name: string; size_bytes: number; mtime: string | null }

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const base = (process.env.PROVISIONER_BASE_URL || "").replace(/\/+$/, "");
  const tok = process.env.PROVISIONER_TOKEN;
  const r = await fetch(`${base}/vms/${slug}/supabase/functions/deployed`, {
    headers: { authorization: `Bearer ${tok}` },
    cache: "no-store",
  });
  const text = await r.text();
  return new NextResponse(text || "[]", { status: r.status, headers: { "content-type": "application/json" } });
}, { scope: "vms:read" });

export type { DeployedFn };
