// Client for the provisioner's VM-lifecycle endpoints (Tranche 1).
// Per the T1 brief these read PROVISIONER_BASE_URL (not the older
// PROVISIONER_URL the apps-client uses — that's flagged for cleanup).

import { ProvisionerHttpError } from "./apps-client";

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
  return (await res.json()) as T;
}

export const provisionerVms = {
  power: (slug: string) => call<VmPower>(`/vms/${slug}/power`),
  action: (slug: string, action: VmAction, actor: string) =>
    call<VmActionResult>(`/vms/${slug}/${action}`, { method: "POST", actor }),
  backups: {
    list: (slug: string) => call<VmBackup[]>(`/vms/${slug}/backups`),
    trigger: (slug: string, actor: string) =>
      call<VmBackupTrigger>(`/vms/${slug}/backups`, { method: "POST", actor }),
  },
};
