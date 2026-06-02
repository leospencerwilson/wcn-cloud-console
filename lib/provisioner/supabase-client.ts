import { ProvisionerHttpError } from "./apps-client";
import type { SupabaseConnection } from "./types";

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
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", body } = init;
  const headers: Record<string, string> = { authorization: `Bearer ${token()}` };
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
  if (res.status === 204) return undefined as T;
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

/* ── Read-only Supabase admin views (proxied via the provisioner) ──── */

export type AuthUserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  phone_confirmed: boolean;
  banned: boolean;
  raw_user_meta_data: Record<string, unknown> | null;
  raw_app_meta_data: Record<string, unknown> | null;
};
export type AuthUsersResp = { users: AuthUserRow[]; total: number; limit: number; offset: number };

export type StorageBucket = {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
  created_at: string;
  updated_at: string;
  object_count: number;
  total_bytes: number;
};

export type StorageObject = {
  name: string;
  bucket_id: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
};
export type StorageObjectsResp = { objects: StorageObject[]; total: number; limit: number; offset: number };

export type RlsPolicy = {
  schemaname: string;
  tablename: string;
  name: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string | null;
  with_check: string | null;
};

export type RealtimeOverview = {
  publications: {
    name: string;
    replicates_inserts: boolean;
    replicates_updates: boolean;
    replicates_deletes: boolean;
    replicates_truncates: boolean;
    all_tables: boolean;
  }[];
  replicated_tables: { publication: string; schema: string; table: string }[];
  replication_slots: { slot_name: string; plugin: string; slot_type: string; active: boolean; restart_lsn: string | null }[];
};

export type FunctionsOverview = {
  functions: { schema: string; name: string }[];
  runtime_note: string;
};

export type AuthUserCreateInput = {
  email?: string;
  phone?: string;
  password?: string;
  email_confirm?: boolean;
  phone_confirm?: boolean;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

export type AuthUserUpdateInput = {
  email?: string;
  password?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  role?: string;
  ban_duration?: "none" | "24h" | "7d" | "permanent";
};

export type BucketCreateInput = {
  name: string;
  public?: boolean;
  file_size_limit?: number | null;
  allowed_mime_types?: string[] | null;
};

export type PolicyCreateInput = {
  schema: string;
  table: string;
  name: string;
  cmd?: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";
  roles?: string[];
  using?: string;
  with_check?: string;
  permissive?: boolean;
};

export const provisionerSupabase = {
  connection: (slug: string) =>
    call<SupabaseConnection>(`/vms/${slug}/supabase/connection`),

  authUsers: (slug: string, limit = 50, offset = 0) =>
    call<AuthUsersResp>(`/vms/${slug}/supabase/auth/users?limit=${limit}&offset=${offset}`),
  authCreateUser: (slug: string, input: AuthUserCreateInput) =>
    call<AuthUserRow>(`/vms/${slug}/supabase/auth/users`, { method: "POST", body: input }),
  authUpdateUser: (slug: string, id: string, patch: AuthUserUpdateInput) =>
    call<AuthUserRow>(`/vms/${slug}/supabase/auth/users/${id}`, { method: "PATCH", body: patch }),
  authDeleteUser: (slug: string, id: string) =>
    call<{ ok: true }>(`/vms/${slug}/supabase/auth/users/${id}`, { method: "DELETE" }),

  storageBuckets: (slug: string) =>
    call<StorageBucket[]>(`/vms/${slug}/supabase/storage/buckets`),
  storageObjects: (slug: string, bucket: string, limit = 100, offset = 0) =>
    call<StorageObjectsResp>(
      `/vms/${slug}/supabase/storage/objects?bucket=${encodeURIComponent(bucket)}&limit=${limit}&offset=${offset}`,
    ),
  storageCreateBucket: (slug: string, input: BucketCreateInput) =>
    call<StorageBucket>(`/vms/${slug}/supabase/storage/buckets`, { method: "POST", body: input }),
  storageDeleteBucket: (slug: string, name: string) =>
    call<{ ok: true }>(`/vms/${slug}/supabase/storage/buckets/${encodeURIComponent(name)}`, { method: "DELETE" }),
  storageDeleteObject: (slug: string, bucket: string, name: string) =>
    call<{ ok: true }>(
      `/vms/${slug}/supabase/storage/objects?bucket=${encodeURIComponent(bucket)}&name=${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),

  policies: (slug: string) =>
    call<RlsPolicy[]>(`/vms/${slug}/supabase/policies`),
  policyCreate: (slug: string, input: PolicyCreateInput) =>
    call<{ ok: true; sql: string }>(`/vms/${slug}/supabase/policies`, { method: "POST", body: input }),
  policyDelete: (slug: string, schema: string, table: string, name: string) =>
    call<{ ok: true }>(
      `/vms/${slug}/supabase/policies?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table)}&name=${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),

  realtime: (slug: string) =>
    call<RealtimeOverview>(`/vms/${slug}/supabase/realtime`),
  functions: (slug: string) =>
    call<FunctionsOverview>(`/vms/${slug}/supabase/functions`),
};
