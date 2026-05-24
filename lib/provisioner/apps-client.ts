// Client for the provisioner's app-management endpoints (PR 2 of the
// Coolify-API integration). Mounted alongside the existing trigger/jobs
// client — reuses PROVISIONER_URL + PROVISIONER_TOKEN. Server-side only.

import type {
  App,
  AppCreateInput,
  AppDomain,
  CronTask,
  CronTaskInput,
  DeployStatus,
  EnvVar,
  AppMetricsResponse,
  DomainCertInput,
  DomainCertMetadata,
  MetricsWindow,
  ProvisionerError,
  RedirectRule,
  RedirectRuleInput,
  Secret,
  SecretInput,
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

type FetchOpts = { slug?: string; method?: string; body?: unknown; actor?: string };

async function p<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { slug, method = "GET", body, actor } = opts;
  const url = new URL(`${baseUrl()}${path}`);
  if (slug && !url.searchParams.has("slug")) url.searchParams.set("slug", slug);

  const res = await fetch(url.toString(), {
    method,
    headers: {
      authorization: `Bearer ${token()}`,
      ...(slug ? { "x-wcn-customer-slug": slug } : {}),
      ...(actor ? { "x-wcn-actor": actor } : {}),
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

export const provisionerApps = {
  apps: {
    list: (slug: string) => p<App[]>("/apps", { slug }),
    create: (slug: string, input: AppCreateInput) =>
      p<App>("/apps", { slug, method: "POST", body: input }),
    get: (id: string, slug?: string) => p<App>(`/apps/${id}`, { slug }),
    patch: (id: string, input: Partial<AppCreateInput>, slug?: string) =>
      p<App>(`/apps/${id}`, { slug, method: "PATCH", body: input }),
    delete: (id: string, slug?: string) =>
      p<{ ok: true }>(`/apps/${id}`, { slug, method: "DELETE" }),
    deploy: (id: string, force = false, slug?: string) =>
      p<DeployStatus>(`/apps/${id}/deploy`, {
        slug,
        method: "POST",
        body: { force },
      }),
    restart: (id: string, slug?: string) =>
      p<{ ok: true; action: "restart"; status: string }>(`/apps/${id}/restart`, {
        slug,
        method: "POST",
      }),
    stop: (id: string, slug?: string) =>
      p<{ ok: true; action: "stop"; status: string }>(`/apps/${id}/stop`, {
        slug,
        method: "POST",
      }),
    start: (id: string, slug?: string) =>
      p<{ ok: true; action: "start"; status: string }>(`/apps/${id}/start`, {
        slug,
        method: "POST",
      }),
    rollback: (id: string, deployment_uuid: string, slug?: string) =>
      p<DeployStatus>(`/apps/${id}/rollback`, {
        slug,
        method: "POST",
        body: { deployment_uuid },
      }),
    deployments: (id: string, slug?: string) =>
      p<DeployStatus[]>(`/apps/${id}/deployments`, { slug }),
    logs: (id: string, tail = 200, slug?: string) =>
      p<{ lines: string[] }>(`/apps/${id}/logs?tail=${tail}`, { slug }),
    metrics: (id: string, window: MetricsWindow, series: string, slug?: string) =>
      p<AppMetricsResponse>(
        `/apps/${id}/metrics?window=${window}&series=${encodeURIComponent(series)}`,
        { slug },
      ),
  },
  env: {
    get: (appId: string, slug?: string) =>
      p<EnvVar[]>(`/apps/${appId}/env`, { slug }),
    put: (appId: string, env: EnvVar[], slug?: string) =>
      p<EnvVar[]>(`/apps/${appId}/env`, { slug, method: "PUT", body: env }),
    importText: (
      appId: string,
      body: {
        text: string;
        is_build_time?: boolean;
        is_preview?: boolean;
        ignore_errors?: boolean;
      },
      slug?: string,
    ) =>
      p<{ imported: number; errors: string[] }>(
        `/apps/${appId}/env/import`,
        { slug, method: "POST", body },
      ),
  },
  cron: {
    list: (appId: string, slug?: string) =>
      p<CronTask[]>(`/apps/${appId}/cron`, { slug }),
    create: (appId: string, input: CronTaskInput, slug?: string) =>
      p<CronTask>(`/apps/${appId}/cron`, { slug, method: "POST", body: input }),
    remove: (appId: string, taskUuid: string, slug?: string) =>
      p<{ ok: true }>(`/apps/${appId}/cron/${taskUuid}`, {
        slug,
        method: "DELETE",
      }),
  },
  domains: {
    list: (appId: string, slug?: string) =>
      p<AppDomain[]>(`/apps/${appId}/domains`, { slug }),
    add: (appId: string, hostname: string, actor?: string, slug?: string) =>
      p<AppDomain>(`/apps/${appId}/domains`, {
        slug,
        method: "POST",
        body: { hostname },
        actor,
      }),
    status: (appId: string, hostname: string, slug?: string) =>
      p<AppDomain>(
        `/apps/${appId}/domains/${encodeURIComponent(hostname)}/status`,
        { slug },
      ),
    remove: (appId: string, hostname: string, actor?: string, slug?: string) =>
      p<{ ok: true }>(
        `/apps/${appId}/domains/${encodeURIComponent(hostname)}`,
        { slug, method: "DELETE", actor },
      ),
  },
  certs: {
    get: (appId: string, hostname: string, slug?: string) =>
      p<DomainCertMetadata>(
        `/apps/${appId}/domains/${encodeURIComponent(hostname)}/cert`,
        { slug },
      ),
    upload: (
      appId: string,
      hostname: string,
      input: DomainCertInput,
      actor?: string,
      slug?: string,
    ) =>
      p<DomainCertMetadata>(
        `/apps/${appId}/domains/${encodeURIComponent(hostname)}/cert`,
        { slug, method: "POST", body: input, actor },
      ),
    remove: (appId: string, hostname: string, actor?: string, slug?: string) =>
      p<{ ok: true }>(
        `/apps/${appId}/domains/${encodeURIComponent(hostname)}/cert`,
        { slug, method: "DELETE", actor },
      ),
  },
  redirects: {
    list: (appId: string, slug?: string) =>
      p<RedirectRule[]>(`/apps/${appId}/redirects`, { slug }),
    create: (
      appId: string,
      input: RedirectRuleInput,
      actor?: string,
      slug?: string,
    ) =>
      p<RedirectRule>(`/apps/${appId}/redirects`, {
        slug,
        method: "POST",
        body: input,
        actor,
      }),
    remove: (appId: string, id: number, actor?: string, slug?: string) =>
      p<{ ok: true }>(`/apps/${appId}/redirects/${id}`, {
        slug,
        method: "DELETE",
        actor,
      }),
  },
  secrets: {
    list: (appId: string, slug?: string) =>
      p<Secret[]>(`/apps/${appId}/secrets`, { slug }),
    put: (appId: string, secrets: SecretInput[], actor?: string, slug?: string) =>
      p<Secret[]>(`/apps/${appId}/secrets`, {
        slug,
        method: "PUT",
        body: secrets,
        actor,
      }),
    reveal: (appId: string, key: string, actor?: string, slug?: string) =>
      p<{ key: string; value: string }>(`/apps/${appId}/secrets/reveal`, {
        slug,
        method: "POST",
        body: { key },
        actor,
      }),
    remove: (appId: string, key: string, actor?: string, slug?: string) =>
      p<{ ok: true }>(`/apps/${appId}/secrets/${encodeURIComponent(key)}`, {
        slug,
        method: "DELETE",
        actor,
      }),
  },
};
