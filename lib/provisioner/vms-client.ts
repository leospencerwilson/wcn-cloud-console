// Client for the provisioner's VM-lifecycle endpoints (Tranche 1).
// Per the T1 brief these read PROVISIONER_BASE_URL (not the older
// PROVISIONER_URL the apps-client uses — that's flagged for cleanup).

import { ProvisionerHttpError } from "./apps-client";
import type { MetricsResponse, MetricsWindow } from "./types";

export type VmPowerState = "running" | "stopped" | "paused";

export type VmPower = {
  state: VmPowerState;
  qmpstatus: string;
  uptime: number;
  cpu: number;
  cpus: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  proxmox_node: string;
  vmid: number;
};

export type VmAction = "restart" | "stop" | "start";

export type VmActionResult = {
  upid: string;
  vmid: number;
  action: VmAction;
};

export type VmBackup = {
  id: number;
  started_at: string;
  finished_at: string | null;
  size_bytes: number | null;
  status: "queued" | "running" | "succeeded" | "failed";
  b2_key: string | null;
  log_path: string | null;
};

export type VmBackupTrigger = {
  job_uuid: string;
  status: string;
};

export type BackupFrequency = "hourly" | "daily" | "weekly" | "disabled";

export type BackupPolicy = {
  customer_slug: string;
  frequency: BackupFrequency;
  retention_days: number;
  time_utc: string;
  enabled: boolean;
  last_run_at: string | null;
};

export type BackupPolicyInput = Partial<{
  frequency: BackupFrequency;
  retention_days: number;
  time_utc: string;
  enabled: boolean;
}>;

export type VmRestoreResult = {
  job_uuid: string;
  status: string;
  backup_id: number;
  ts: string;
};

export type VmResizeInput = {
  cores?: number;
  memory_mb?: number;
  disk_gb?: number;
};

export type VmResizeResult = {
  cores: number;
  memory_mb: number;
  disk_gb: number;
  needs_restart: boolean;
};

export type VmSnapshot = {
  name: string;
  description: string | null;
  parent: string | null;
  snaptime: number;
  vmstate: boolean;
};

export type VmSnapshotInput = {
  name: string;
  label?: string;
};

export type VmSnapshotResult = {
  upid: string;
  vmid: number;
  name: string;
};

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

export async function streamBackupDownload(
  slug: string,
  backupId: number,
  passphrase: string,
  actor: string,
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(
    `${baseUrl()}/vms/${slug}/backups/${backupId}/download`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token()}`,
        "content-type": "application/json",
        "x-wcn-actor": actor,
      },
      body: JSON.stringify({ passphrase }),
      cache: "no-store",
      signal,
    },
  );
  return res;
}

type CallOpts = {
  method?: string;
  body?: unknown;
  actor?: string;
};

async function call<T>(path: string, opts: CallOpts = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      authorization: `Bearer ${token()}`,
      ...(opts.body ? { "content-type": "application/json" } : {}),
      ...(opts.actor ? { "x-wcn-actor": opts.actor } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
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

export const provisionerVms = {
  power: (slug: string) => call<VmPower>(`/vms/${slug}/power`),
  action: (slug: string, action: VmAction, actor: string) =>
    call<VmActionResult>(`/vms/${slug}/${action}`, { method: "POST", actor }),
  resize: (slug: string, input: VmResizeInput, actor: string) =>
    call<VmResizeResult>(`/vms/${slug}/resize`, {
      method: "POST",
      body: input,
      actor,
    }),
  backups: {
    list: (slug: string) => call<VmBackup[]>(`/vms/${slug}/backups`),
    trigger: (slug: string, actor: string) =>
      call<VmBackupTrigger>(`/vms/${slug}/backups`, { method: "POST", actor }),
    restore: (slug: string, backupId: number, actor: string) =>
      call<VmRestoreResult>(
        `/vms/${slug}/backups/${backupId}/restore`,
        { method: "POST", actor },
      ),
  },
  backupPolicy: {
    get: (slug: string) => call<BackupPolicy>(`/vms/${slug}/backup-policy`),
    put: (slug: string, input: BackupPolicyInput, actor: string) =>
      call<BackupPolicy>(`/vms/${slug}/backup-policy`, {
        method: "PUT",
        body: input,
        actor,
      }),
  },
  metrics: (slug: string, window: MetricsWindow, series: string) =>
    call<MetricsResponse>(
      `/vms/${slug}/metrics?window=${window}&series=${encodeURIComponent(series)}`,
    ),
  snapshots: {
    list: (slug: string) => call<VmSnapshot[]>(`/vms/${slug}/snapshots`),
    create: (slug: string, input: VmSnapshotInput, actor: string) =>
      call<VmSnapshotResult>(`/vms/${slug}/snapshots`, {
        method: "POST",
        body: input,
        actor,
      }),
    revert: (slug: string, name: string, actor: string) =>
      call<VmSnapshotResult>(`/vms/${slug}/snapshots/${name}/revert`, {
        method: "POST",
        actor,
      }),
    remove: (slug: string, name: string, actor: string) =>
      call<VmSnapshotResult>(`/vms/${slug}/snapshots/${name}`, {
        method: "DELETE",
        actor,
      }),
  },
};
