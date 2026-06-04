import { ProvisionerHttpError } from "./apps-client";

export type DnsProvider = "cloudflare" | "route53" | "google" | "vercel" | "digitalocean";

export interface DnsZone {
  id: string;
  name: string;
  capabilities: { alias: boolean; cname_flattening: boolean };
}

export interface DnsProviderField {
  name: string;
  label: string;
  type: "text" | "password" | "textarea";
  hint?: string;
}

export interface DnsProviderMeta {
  key: DnsProvider;
  label: string;
  docs_url: string;
  fields: DnsProviderField[];
  apex_supported: boolean;
}

export interface DnsIntegration {
  id: string;
  provider: DnsProvider;
  display_name: string;
  zones_cache: DnsZone[];
  last_zone_sync_at: string | null;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
  created_at: string;
  created_by: string | null;
}

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

async function call<T>(
  path: string,
  init: RequestInit & { actor?: string } = {},
): Promise<T> {
  const { actor, headers, ...rest } = init;
  const res = await fetch(`${baseUrl()}${path}`, {
    ...rest,
    headers: {
      authorization: `Bearer ${token()}`,
      ...(rest.body ? { "content-type": "application/json" } : {}),
      ...(actor ? { "x-wcn-actor": actor } : {}),
      ...(headers || {}),
    },
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
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const provisionerDns = {
  providersMeta: () => call<DnsProviderMeta[]>(`/dns-providers`),
  list: (slug: string) => call<DnsIntegration[]>(`/customers/${slug}/dns-integrations`),
  get: (slug: string, id: string) =>
    call<DnsIntegration>(`/customers/${slug}/dns-integrations/${id}`),
  create: (
    slug: string,
    body: { provider: DnsProvider; display_name: string; credentials: Record<string, unknown> },
    actor: string,
  ) =>
    call<DnsIntegration>(`/customers/${slug}/dns-integrations`, {
      method: "POST",
      body: JSON.stringify(body),
      actor,
    }),
  remove: (slug: string, id: string, actor: string) =>
    call<{ ok: true }>(`/customers/${slug}/dns-integrations/${id}`, {
      method: "DELETE",
      actor,
    }),
  test: (slug: string, id: string) =>
    call<{ ok: true } | { ok: false; error: string }>(
      `/customers/${slug}/dns-integrations/${id}/test`,
      { method: "POST" },
    ),
  refreshZones: (slug: string, id: string) =>
    call<DnsZone[]>(`/customers/${slug}/dns-integrations/${id}/zones`, {
      method: "POST",
    }),
};
