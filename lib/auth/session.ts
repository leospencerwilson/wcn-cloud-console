import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUser, type AppUser } from "@/lib/db/users";

export interface Session {
  authUser: User;
  appUser: AppUser;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const appUser = await getAppUser(user.id);
  if (!appUser || appUser.status !== "active") return null;
  return { authUser: user, appUser };
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
  if (session.appUser.role !== "customer_admin") redirect("/admin");
  if (!session.appUser.customer_slug) redirect("/login");
  return session;
}
