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
