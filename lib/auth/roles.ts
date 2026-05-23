import type { TeamRole } from "@/lib/provisioner/types";

export const ROLE_ORDER: TeamRole[] = ["viewer", "developer", "admin", "owner"];

export function roleAtLeast(role: TeamRole | null, min: TeamRole): boolean {
  if (!role) return false;
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}

export function canManageTeam(role: TeamRole | null): boolean {
  return roleAtLeast(role, "admin");
}

export function canDeploy(role: TeamRole | null): boolean {
  return roleAtLeast(role, "developer");
}

export function canMutate(role: TeamRole | null): boolean {
  return roleAtLeast(role, "developer");
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function loadCustomerRole(
  slug: string,
  email: string,
): Promise<TeamRole | null> {
  const base = process.env.PROVISIONER_BASE_URL;
  const token = process.env.PROVISIONER_TOKEN;
  if (!base || !token) return null;
  const url = `${base.replace(/\/+$/, "")}/customers/${slug}/team/by-email?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`role lookup failed: HTTP ${res.status}`);
  const data = (await res.json()) as { role?: TeamRole };
  return data.role ?? null;
}
