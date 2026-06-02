import { randomBytes } from "node:crypto";

type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue): void => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === "string" || typeof v === "number") {
      out.push(String(v));
    }
  };
  inputs.forEach(walk);
  return out.join(" ");
}

export function randomToken(byteLen = 32): string {
  return randomBytes(byteLen).toString("base64url");
}

// Maps any status (customer, VM, deployment) to a pill class.
// Green = healthy, amber = transient, red = needs attention, grey = inert.
export function statusPill(status: string | null | undefined): string {
  const key = (status ?? "").toLowerCase();
  if (key === "active" || key === "running" || key === "online") {
    return "pill pill-dot pill-active";
  }
  if (
    key === "provisioning" ||
    key === "rebooting" ||
    key === "pending" ||
    key === "starting"
  ) {
    return "pill pill-dot pill-provisioning";
  }
  if (key === "failed" || key === "error" || key === "offline") {
    return "pill pill-dot pill-failed";
  }
  if (key === "deleted" || key === "destroyed" || key === "expired") {
    return "pill pill-dot pill-deleted";
  }
  return "pill pill-dot pill-used";
}

export function roleLabel(role: string | null | undefined): string {
  switch (role) {
    case "wcn_admin":
      return "WCN Admin";
    case "customer_admin":
      return "Customer Admin";
    default:
      return role ?? "";
  }
}

/* ── Audit action formatting ──────────────────────────────────────────────
   Raw audit keys like "admin.impersonate.stop" or "deprovision-done" are hard
   to scan. We turn them into readable labels and a semantic tone for colour. */

export type AuditTone = "ok" | "warn" | "crit" | "info" | "neutral";

// Nouns that should be rephrased / acronyms that stay uppercase.
const ACTION_NOUNS: Record<string, string> = {
  vm: "VM",
  dns: "DNS",
  tls: "TLS",
  ssl: "SSL",
  api: "API",
  env: "environment",
  impersonate: "impersonation",
  provision: "provisioning",
  deprovision: "deprovisioning",
};

// Verb tokens normalised to past tense for natural reading.
const ACTION_VERBS: Record<string, string> = {
  start: "started",
  started: "started",
  stop: "stopped",
  stopped: "stopped",
  done: "completed",
  complete: "completed",
  completed: "completed",
  fail: "failed",
  failed: "failed",
  create: "created",
  created: "created",
  delete: "deleted",
  deleted: "deleted",
  remove: "removed",
  removed: "removed",
  update: "updated",
  updated: "updated",
  revoke: "revoked",
  revoked: "revoked",
  reveal: "revealed",
  revealed: "revealed",
  add: "added",
  added: "added",
  rename: "renamed",
  resize: "resized",
  reboot: "rebooted",
  restart: "restarted",
  deploy: "deployed",
  rollback: "rolled back",
  import: "imported",
  export: "exported",
  enable: "enabled",
  disable: "disabled",
  restore: "restored",
};

export function auditActionTone(action: string): AuditTone {
  const a = action.toLowerCase();
  if (/(fail|error|denied|reject)/.test(a)) return "crit";
  if (a.includes("impersonate")) return "info";
  if (/(deprovision|destroy|delete|remove|archive|revoke|stop|abort|disable)/.test(a))
    return "warn";
  if (/(start|done|complete|create|provision|success|deploy|add|enable|restore)/.test(a))
    return "ok";
  return "neutral";
}

export function formatAuditAction(action: string): {
  label: string;
  tone: AuditTone;
} {
  const tone = auditActionTone(action);
  const tokens = action.split(/[.\-_]/).filter(Boolean);
  if (tokens[0] === "admin") tokens.shift();
  if (tokens.length === 0) return { label: action, tone };
  const words = tokens.map((t) => {
    const k = t.toLowerCase();
    return ACTION_VERBS[k] ?? ACTION_NOUNS[k] ?? k;
  });
  const joined = words.join(" ");
  return { label: joined.charAt(0).toUpperCase() + joined.slice(1), tone };
}
