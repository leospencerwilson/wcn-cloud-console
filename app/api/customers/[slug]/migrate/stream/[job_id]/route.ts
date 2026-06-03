import { type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 3600;

// Pass-through SSE: forward the provisioner's stream to the browser
// unbuffered. Closing the client connection cancels the upstream fetch
// so we don't leak the file descriptor.
export const GET = withCustomerAuth<{ slug: string; job_id: string }>(async (req: NextRequest, { slug, params }) => {
  const base = (process.env.PROVISIONER_BASE_URL || "").replace(/\/+$/, "");
  const tok = process.env.PROVISIONER_TOKEN;
  const ctrl = new AbortController();
  req.signal.addEventListener("abort", () => ctrl.abort());
  const upstream = await fetch(`${base}/vms/${slug}/migrate/stream/${params.job_id}`, {
    headers: { authorization: `Bearer ${tok}`, accept: "text/event-stream", "x-wcn-slug": slug },
    signal: ctrl.signal,
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(`upstream ${upstream.status}`, { status: upstream.status });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
}, { scope: "vms:write" });
