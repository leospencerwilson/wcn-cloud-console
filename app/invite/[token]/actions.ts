"use server";

import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getInviteByToken,
  markInviteUsed,
} from "@/lib/db/invites";
import { createAppUser, getAppUserByEmail } from "@/lib/db/users";
import { writeAudit } from "@/lib/db/customers";

const inputSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(120),
});

type Result =
  | { ok: true }
  | { ok: false; error: string };

export async function acceptInvite(raw: unknown): Promise<Result> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }
  const { token, password, name } = parsed.data;

  const invite = await getInviteByToken(token);
  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.used_at) return { ok: false, error: "Invite already used" };
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: "Invite expired" };
  }

  const existing = await getAppUserByEmail(invite.email);
  if (existing) {
    return { ok: false, error: "An account already exists for this email" };
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Could not create user" };
  }

  try {
    await createAppUser({
      id: data.user.id,
      email: invite.email,
      name,
      role: invite.role,
      customerSlug: invite.customer_slug,
    });
    await markInviteUsed(invite.id, data.user.id);
    await writeAudit(
      invite.email,
      "invite.accepted",
      invite.customer_slug,
      { role: invite.role, inviteId: invite.id },
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to finalise account",
    };
  }

  return { ok: true };
}
