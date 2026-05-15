import { query } from "./pool";

export type AppUserRole = "wcn_admin" | "customer_admin";
export type AppUserStatus = "active" | "disabled" | "deleted";

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: AppUserRole;
  customer_slug: string | null;
  status: AppUserStatus;
  created_at: string;
  last_login_at: string | null;
}

export async function getAppUser(authId: string): Promise<AppUser | null> {
  const rows = await query<AppUser>(
    `select id, email, name, role, customer_slug, status, created_at, last_login_at
       from app_users
      where id = $1`,
    [authId],
  );
  return rows[0] ?? null;
}

export async function getAppUserByEmail(email: string): Promise<AppUser | null> {
  const rows = await query<AppUser>(
    `select id, email, name, role, customer_slug, status, created_at, last_login_at
       from app_users
      where email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export interface CreateAppUserInput {
  id: string;
  email: string;
  name: string | null;
  role: AppUserRole;
  customerSlug: string | null;
}

export async function createAppUser(input: CreateAppUserInput): Promise<AppUser> {
  const rows = await query<AppUser>(
    `insert into app_users (id, email, name, role, customer_slug, status, created_at)
     values ($1, $2, $3, $4, $5, 'active', now())
     returning id, email, name, role, customer_slug, status, created_at, last_login_at`,
    [input.id, input.email, input.name, input.role, input.customerSlug],
  );
  if (!rows[0]) throw new Error("Insert failed");
  return rows[0];
}

export async function countAppUsers(): Promise<number> {
  const rows = await query<{ count: string }>(
    `select count(*)::text as count from app_users where status = 'active'`,
  );
  return Number(rows[0]?.count ?? 0);
}
