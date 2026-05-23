import { ProvisionerHttpError } from "./apps-client";
import type {
  CoolifyCronOverview,
  CoolifyEnvOverview,
  CoolifyWebhookOverview,
} from "./types";

function baseUrl(): string {
  const url = process.env.PROVISIONER_BASE_URL;
  if (!url) throw new Error("PROVISIONER_BASE_URL is not set");
  return url.replace(/\/+$/, "");
}

function token(): string {
  const t = process.env.PROVISIONER_TOKEN;
  if (!t) throw new Error("PROVISIONER_TOKEN is not set");
  return t;
}

async function call<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res
      .json()
      .catch(() => ({ error: res.statusText, code: "http_error" }))) as {
      error?: string;
      code?: string;
    };
    throw new ProvisionerHttpError(
      res.status,
      err.code || "http_error",
      err.error || res.statusText,
    );
  }
  return (await res.json()) as T;
}

export const provisionerCoolify = {
  webhooks: (slug: string) =>
    call<CoolifyWebhookOverview[]>(`/vms/${slug}/coolify/webhooks`),
  env: (slug: string) =>
    call<CoolifyEnvOverview[]>(`/vms/${slug}/coolify/env`),
  cron: (slug: string) =>
    call<CoolifyCronOverview[]>(`/vms/${slug}/coolify/cron`),
};
