// Proxies a Server-Sent Events stream from the provisioner to the browser,
// keeping the bearer token server-side. Used by deploy-logs, runtime-logs
// and the one-off exec console.

import { NextResponse } from "next/server";

type ProxyOpts = {
  path: string; // e.g. "/apps/abc/deployments/xyz/logs"
  slug: string;
  method?: "GET" | "POST";
  body?: unknown;
  actor?: string;
  signal?: AbortSignal;
};

function baseUrl(): string {
  const url = process.env.PROVISIONER_URL || process.env.PROVISIONER_BASE_URL;
  if (!url) throw new Error("PROVISIONER_URL is not set");
  return url.replace(/\/+$/, "");
}

function token(): string {
  const t = process.env.PROVISIONER_TOKEN;
  if (!t) throw new Error("PROVISIONER_TOKEN is not set");
  return t;
}

export async function proxySse(opts: ProxyOpts): Promise<Response> {
  const url = new URL(`${baseUrl()}${opts.path}`);
  if (!url.searchParams.has("slug")) url.searchParams.set("slug", opts.slug);

  const upstream = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: {
      authorization: `Bearer ${token()}`,
      accept: "text/event-stream",
      "x-wcn-customer-slug": opts.slug,
      ...(opts.body ? { "content-type": "application/json" } : {}),
      ...(opts.actor ? { "x-wcn-actor": opts.actor } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
    signal: opts.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: text || upstream.statusText, code: "upstream_error" },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
