import { NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await requireWcnAdmin();
  const { slug } = await params;

  const url = `https://${slug}.western-communication.com/healthz`;
  const started = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);

  let state: "online" | "offline" | "rebooting" | "unknown" = "unknown";
  let status: number | null = null;
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "manual",
    });
    status = res.status;
    if (res.ok) state = "online";
    else if (res.status === 502 || res.status === 503) state = "rebooting";
    else state = "offline";
  } catch {
    state = "offline";
  } finally {
    clearTimeout(t);
  }

  return NextResponse.json({
    state,
    latency_ms: Date.now() - started,
    status,
    checked_at: new Date().toISOString(),
  });
}
