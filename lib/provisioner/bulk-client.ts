import { ProvisionerHttpError } from "./apps-client";
import type {
  BulkJob,
  BulkJobCreated,
  BulkOperation,
  BulkTargetFilter,
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
  return (await res.json()) as T;
}

export type BulkCreateInput = {
  operation: BulkOperation;
  args?: Record<string, unknown>;
  target_filter: BulkTargetFilter;
  dry_run?: boolean;
};

export const provisionerBulk = {
  list: (limit = 50) => call<BulkJob[]>(`/admin/bulk?limit=${limit}`),
  get: (id: number) => call<BulkJob>(`/admin/bulk/${id}`),
  create: (input: BulkCreateInput, actor: string) =>
    call<BulkJobCreated>(`/admin/bulk`, {
      method: "POST",
      body: JSON.stringify(input),
      actor,
    }),
  abort: (id: number, actor: string) =>
    call<{ ok: true }>(`/admin/bulk/${id}/abort`, {
      method: "POST",
      actor,
    }),
};
