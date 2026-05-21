// Client for the provisioner's app-management endpoints (PR 2 of the
// Coolify-API integration). Mounted alongside the existing trigger/jobs
// client — reuses PROVISIONER_URL + PROVISIONER_TOKEN. Server-side only.

import type {
  App,
  AppCreateInput,
  AppDomain,
  DeployStatus,
  EnvVar,
  ProvisionerError,
} from "./types";

function baseUrl(): string {
  const url = process.env.PROVISIONER_URL;
  if (!url) throw new Error("PROVISIONER_URL is not set");
  return url.replace(/\/+$/, "");
}

function token(): string {
  const t = process.env.PROVISIONER_TOKEN;
  if (!t) throw new Error("PROVISIONER_TOKEN is not set");
  return t;
}

export class ProvisionerHttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type FetchOpts = { slug?: string; method?: string; body?: unknown };

async function p<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { slug, method = "GET", body } = opts;
  const url = new URL(`${baseUrl()}${path}`);
  if (slug && !url.searchParams.has("slug")) url.searchParams.set("slug", slug);

  const res = await fetch(url.toString(), {
    method,
    headers: {
      authorization: `Bearer ${token()}`,
      ...(slug ? { "x-wcn-customer-slug": slug } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const err: ProvisionerError = await res
      .json()
      .catch(() => ({ error: res.statusText, code: "unknown" }));
    throw new ProvisionerHttpError(res.status, err.code, err.error);
  }
  return (await res.json()) as T;
}

export const provisionerApps = {
  apps: {
    list: (slug: string) => p<App[]>("/apps", { slug }),
    create: (slug: string, input: AppCreateInput) =>
      p<App>("/apps", { slug, method: "POST", body: input }),
    get: (id: string) => p<App>(`/apps/${id}`),
    patch: (id: string, input: Partial<AppCreateInput>) =>
      p<App>(`/apps/${id}`, { method: "PATCH", body: input }),
    delete: (id: string) =>
      p<{ ok: true }>(`/apps/${id}`, { method: "DELETE" }),
    deploy: (id: string, force = false) =>
      p<DeployStatus>(`/apps/${id}/deploy`, {
        method: "POST",
        body: { force },
      }),
    deployments: (id: string) =>
      p<DeployStatus[]>(`/apps/${id}/deployments`),
    logs: (id: string, tail = 200) =>
      p<{ lines: string[] }>(`/apps/${id}/logs?tail=${tail}`),
  },
  env: {
    get: (appId: string) => p<EnvVar[]>(`/apps/${appId}/env`),
    put: (appId: string, env: EnvVar[]) =>
      p<EnvVar[]>(`/apps/${appId}/env`, { method: "PUT", body: env }),
  },
  domains: {
    list: (appId: string) => p<AppDomain[]>(`/apps/${appId}/domains`),
    add: (appId: string, hostname: string) =>
      p<AppDomain>(`/apps/${appId}/domains`, {
        method: "POST",
        body: { hostname },
      }),
    status: (appId: string, hostname: string) =>
      p<AppDomain>(
        `/apps/${appId}/domains/${encodeURIComponent(hostname)}`,
      ),
    remove: (appId: string, hostname: string) =>
      p<{ ok: true }>(
        `/apps/${appId}/domains/${encodeURIComponent(hostname)}`,
        { method: "DELETE" },
      ),
  },
};
