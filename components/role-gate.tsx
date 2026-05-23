"use client";

import { Children, cloneElement, isValidElement, useEffect, useState } from "react";
import type { TeamRole } from "@/lib/provisioner/types";
import { roleAtLeast } from "@/lib/auth/roles";

export function useCustomerRole(slug: string): TeamRole | null | undefined {
  const [role, setRole] = useState<TeamRole | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetch(`/api/customers/${slug}/team/me`, { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        if (!r.ok) {
          setRole(null);
          return;
        }
        const d = (await r.json().catch(() => ({}))) as { role?: TeamRole | null };
        setRole(d.role ?? null);
      })
      .catch(() => alive && setRole(null));
    return () => {
      alive = false;
    };
  }, [slug]);
  return role;
}

// Renders children only if the caller's role meets `min`. While the role is
// being resolved, renders a placeholder (or nothing). If the user's role is
// below the minimum, optionally renders `fallback`.
export default function RoleGate({
  slug,
  min,
  children,
  fallback = null,
  loadingFallback = null,
}: {
  slug: string;
  min: TeamRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}) {
  const role = useCustomerRole(slug);
  if (role === undefined) return <>{loadingFallback}</>;
  if (!roleAtLeast(role, min)) return <>{fallback}</>;
  return <>{children}</>;
}

// Wraps interactive children: when role is insufficient, clones them with
// `disabled` and a tooltip-style title attribute explaining why.
export function RoleAware({
  slug,
  min,
  children,
  reason,
}: {
  slug: string;
  min: TeamRole;
  children: React.ReactElement;
  reason?: string;
}) {
  const role = useCustomerRole(slug);
  const blocked = role !== undefined && !roleAtLeast(role, min);
  if (!blocked || !isValidElement(children)) return <>{Children.only(children)}</>;
  const props = children.props as Record<string, unknown>;
  return cloneElement(children, {
    ...props,
    disabled: true,
    title: reason ?? `Requires role: ${min}`,
    style: { ...((props.style as object) || {}), opacity: 0.5 },
    onClick: (e: React.MouseEvent) => e.preventDefault(),
  } as Record<string, unknown>);
}
