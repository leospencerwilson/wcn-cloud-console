import { ProvisionerHttpError } from "./apps-client";
import type {
  DbColumn,
  DbQueryError,
  DbQueryResult,
  DbSizes,
  DbTable,
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
    const err = (await res
      .json()
      .catch(() => ({ error: res.statusText, code: "http_error" }))) as {
      error?: string;
      code?: string;
      duration_ms?: number;
    };
    throw new ProvisionerHttpError(
      res.status,
      err.code || "http_error",
      err.error || res.statusText,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type DbQueryInput = { sql: string; max_rows?: number };

export const provisionerDb = {
  tables: (slug: string) => call<DbTable[]>(`/vms/${slug}/db/tables`),
  columns: (slug: string, schema: string, table: string) =>
    call<DbColumn[]>(
      `/vms/${slug}/db/columns?schema=${encodeURIComponent(
        schema,
      )}&table=${encodeURIComponent(table)}`,
    ),
  sizes: (slug: string) => call<DbSizes>(`/vms/${slug}/db/sizes`),
  query: (slug: string, input: DbQueryInput, actor: string) =>
    call<DbQueryResult>(`/vms/${slug}/db/query`, {
      method: "POST",
      body: JSON.stringify(input),
      actor,
    }),
};

export type { DbQueryError };
