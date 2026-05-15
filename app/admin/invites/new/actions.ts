"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWcnAdmin } from "@/lib/auth/session";
import { createInvite } from "@/lib/db/invites";
import { writeAudit } from "@/lib/db/customers";
import { randomToken } from "@/lib/utils";

const schema = z
  .object({
    email: z.string().email(),
    role: z.enum(["wcn_admin", "customer_admin"]),
    customerSlug: z.string().min(1).optional(),
  })
  .refine(
    (v) => v.role !== "customer_admin" || !!v.customerSlug,
    { message: "customer_admin requires a customer slug" },
  );

export async function createInviteAction(formData: FormData): Promise<void> {
  const session = await requireWcnAdmin();
  const rawSlug = formData.get("customerSlug");
  const parsed = schema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    customerSlug: rawSlug && rawSlug !== "" ? String(rawSlug) : undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await createInvite({
    token,
    email: parsed.data.email,
    role: parsed.data.role,
    customerSlug: parsed.data.customerSlug ?? null,
    createdBy: session.appUser.id,
    expiresAt,
  });

  await writeAudit(
    session.appUser.email,
    "invite.created",
    invite.customer_slug,
    { inviteId: invite.id, role: invite.role, email: invite.email },
  );

  const base = process.env.INVITE_BASE_URL ?? "https://console.western-communication.com";
  const url = `${base}/invite/${token}`;
  const params = new URLSearchParams({ url, email: invite.email });
  redirect(`/admin/invites/new?${params.toString()}`);
}
