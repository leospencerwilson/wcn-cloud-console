import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUser, type AppUser } from "@/lib/db/users";
import {
  ImpersonateReadOnlyError,
  readImpersonate,
  type ImpersonateClaims,
} from "./impersonate";
import { ForbiddenError, loadCustomerRole, roleAtLeast } from "./roles";
import type { TeamRole } from "@/lib/provisioner/types";

export interface Session {
  authUser: User;
  appUser: AppUser;
  impersonating?: ImpersonateClaims;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const appUser = await getAppUser(user.id);
  if (!appUser || appUser.status !== "active") return null;

  let impersonating: ImpersonateClaims | undefined;
  if (appUser.role === "wcn_admin") {
    const claims = await readImpersonate();
    if (claims && claims.admin_id === appUser.id) impersonating = claims;
  }
  return { authUser: user, appUser, impersonating };
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireWcnAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.appUser.role !== "wcn_admin") redirect("/dashboard");
  return session;
}

export async function requireCustomerAdmin(): Promise<Session> {
  const session = await requireSession();

  if (session.impersonating && session.appUser.role === "wcn_admin") {
    const synthetic: AppUser = {
      ...session.appUser,
      role: "customer_admin",
      customer_slug: session.impersonating.customer_slug,
    };
    return {
      authUser: session.authUser,
      appUser: synthetic,
      impersonating: session.impersonating,
    };
  }

  if (session.appUser.role !== "customer_admin") redirect("/admin");
  if (!session.appUser.customer_slug) redirect("/login");
  return session;
}

export function requireMutationAllowed(session: Session): void {
  if (session.impersonating) {
    throw new ImpersonateReadOnlyError();
  }
}

// Resolve the team role for the active session+customer. Returns null if
// the user isn't in the team table; callers decide how to treat that.
// Owner is returned for an impersonating wcn_admin or any wcn_admin caller —
// the wcn_admin role transcends per-customer RBAC.
export async function getCustomerRole(
  session: Session,
  slug: string,
): Promise<TeamRole | null> {
  if (session.impersonating) return "owner";
  if (session.appUser.role === "wcn_admin") return "owner";
  return loadCustomerRole(slug, session.appUser.email);
}

export async function requireRole(
  slug: string,
  min: TeamRole,
): Promise<{ session: Session; role: TeamRole }> {
  const session = await requireSession();
  const role = await getCustomerRole(session, slug);
  if (!roleAtLeast(role, min)) {
    throw new ForbiddenError(`requires ${min}, have ${role ?? "none"}`);
  }
  return { session, role: role as TeamRole };
}
