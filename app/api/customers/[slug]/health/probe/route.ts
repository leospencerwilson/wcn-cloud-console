import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProbeResult = {
  state: "online" | "offline" | "rebooting";
  status: number | null;
  latency_ms: number | null;
  checked_at: string;
};

export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const url = `https://${slug}.${rootDomain}/healthz`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  const started = performance.now();
  let result: ProbeResult;
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    const ms = Math.round(performance.now() - started);
    let state: ProbeResult["state"] = "offline";
    if (res.ok) state = "online";
    else if (res.status === 502 || res.status === 503) state = "rebooting";
    result = {
      state,
      status: res.status,
      latency_ms: ms,
      checked_at: new Date().toISOString(),
    };
  } catch {
    result = {
      state: "offline",
      status: null,
      latency_ms: null,
      checked_at: new Date().toISOString(),
    };
  } finally {
    clearTimeout(t);
  }
  return NextResponse.json(result);
}, { scope: "vms:read" });
