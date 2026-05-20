"use server";

import { z } from "zod";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import {
  getInviteByToken,
  markInviteUsed,
} from "@/lib/db/invites";
import { createAppUser, getAppUserByEmail } from "@/lib/db/users";
import { getCustomer, writeAudit } from "@/lib/db/customers";
import { sendAccountCreatedEmail } from "@/lib/email/send-account-created";

const inputSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(120),
});

type Result =
  | { ok: true; redirectTo: string }
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

  if (process.env.RESEND_API_KEY) {
    try {
      const customerName = invite.customer_slug
        ? (await getCustomer(invite.customer_slug))?.name ?? null
        : null;
      await sendAccountCreatedEmail({
        to: invite.email,
        name,
        role: invite.role,
        customerName,
      });
    } catch (err) {
      // Non-fatal: account is created, user is about to be signed in;
      // we just couldn't send the welcome email.
      console.error(
        `[account-created] email failed for ${invite.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Sign the new user in server-side so the response sets the session cookies.
  // Without this the client has to bounce through /login with the same
  // credentials they just typed — bad UX and the "no autoredirect" complaint.
  const sessionClient = await createSupabaseServerClient();
  const { error: signInError } = await sessionClient.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInError) {
    // Account was created successfully; just couldn't auto-sign-in.
    // Fall back to login screen rather than blocking the user.
    return { ok: true, redirectTo: "/login" };
  }

  const redirectTo = invite.role === "wcn_admin" ? "/admin" : "/dashboard";
  return { ok: true, redirectTo };
}
