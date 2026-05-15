import { query } from "./pool";
import type { AppUserRole } from "./users";

export interface Invite {
  id: string;
  token: string;
  email: string;
  role: AppUserRole;
  customer_slug: string | null;
  created_by: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_user_id: string | null;
}

export interface CreateInviteInput {
  token: string;
  email: string;
  role: AppUserRole;
  customerSlug: string | null;
  createdBy: string;
  expiresAt: Date;
}

export async function createInvite(input: CreateInviteInput): Promise<Invite> {
  const rows = await query<Invite>(
    `insert into invites
       (id, token, email, role, customer_slug, created_by, created_at, expires_at)
     values
       (gen_random_uuid(), $1, $2, $3, $4, $5, now(), $6)
     returning id, token, email, role, customer_slug, created_by, created_at,
               expires_at, used_at, used_by_user_id`,
    [
      input.token,
      input.email,
      input.role,
      input.customerSlug,
      input.createdBy,
      input.expiresAt.toISOString(),
    ],
  );
  if (!rows[0]) throw new Error("Insert failed");
  return rows[0];
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const rows = await query<Invite>(
    `select id, token, email, role, customer_slug, created_by, created_at,
            expires_at, used_at, used_by_user_id
       from invites
      where token = $1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function markInviteUsed(id: string, userId: string): Promise<void> {
  await query(
    `update invites set used_at = now(), used_by_user_id = $1 where id = $2`,
    [userId, id],
  );
}

export async function listInvites(): Promise<Invite[]> {
  return query<Invite>(
    `select id, token, email, role, customer_slug, created_by, created_at,
            expires_at, used_at, used_by_user_id
       from invites
      order by created_at desc
      limit 100`,
  );
}

export async function countPendingInvites(): Promise<number> {
  const rows = await query<{ count: string }>(
    `select count(*)::text as count
       from invites
      where used_at is null and expires_at > now()`,
  );
  return Number(rows[0]?.count ?? 0);
}
