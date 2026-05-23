// Customer-scoped provisioner endpoints (T2): audit log.
// Server-side only.

import { ProvisionerHttpError } from "./apps-client";
import type { AuditEvent } from "./types";

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

export type AuditQuery = {
  since?: string;
  until?: string;
  action?: string;
  limit?: number;
};

async function call<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: res.statusText, code: "http_error" }));
    throw new ProvisionerHttpError(
      res.status,
      err.code || "http_error",
      err.error || res.statusText,
    );
  }
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProvisionerHttpError(
      res.status,
      "bad_upstream_body",
      `Upstream returned non-JSON body (${res.status})`,
    );
  }
}

export const provisionerCustomers = {
  audit: (slug: string, q: AuditQuery = {}) => {
    const params = new URLSearchParams();
    if (q.since) params.set("since", q.since);
    if (q.until) params.set("until", q.until);
    if (q.action) params.set("action", q.action);
    if (q.limit) params.set("limit", String(q.limit));
    const qs = params.toString();
    return call<AuditEvent[]>(`/customers/${slug}/audit${qs ? `?${qs}` : ""}`);
  },
};
