"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWcnAdmin } from "@/lib/auth/session";
import {
  archiveCustomer,
  getCustomer,
  unarchiveCustomer,
  updateCustomer,
  writeAudit,
  setLastJobId,
} from "@/lib/db/customers";
import { startDeprovision } from "@/lib/provisioner/client";

export type ActionState = { error?: string; ok?: true } | undefined;

const tierEnum = z.enum(["site", "site-db", "pro"]);

const identitySchema = z.object({
  name: z.string().min(1).max(120),
  tier: tierEnum,
  contact_email: z.string().email(),
});

function nullableTrimmed(max = 500) {
  return z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional();
}

const billingSchema = z.object({
  billing_contact_name: nullableTrimmed(120),
  billing_contact_email: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .transform((s) => (s === "" ? null : s))
    .refine((v) => v === null || /.+@.+\..+/.test(v), "Invalid email")
    .nullable()
    .optional(),
  technical_contact_name: nullableTrimmed(120),
  technical_contact_email: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .transform((s) => (s === "" ? null : s))
    .refine((v) => v === null || /.+@.+\..+/.test(v), "Invalid email")
    .nullable()
    .optional(),
  billing_address: nullableTrimmed(2000),
  vat_number: nullableTrimmed(64),
  go_live_date: z
    .string()
    .max(20)
    .transform((s) => s.trim())
    .transform((s) => (s === "" ? null : s))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date")
    .nullable()
    .optional(),
  notes: nullableTrimmed(4000),
});

export async function updateIdentityAction(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireWcnAdmin();
  const parsed = identitySchema.safeParse({
    name: formData.get("name"),
    tier: formData.get("tier"),
    contact_email: formData.get("contact_email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const customer = await getCustomer(slug);
  if (!customer) return { error: "Customer not found" };
  await updateCustomer(slug, parsed.data);
  await writeAudit(session.appUser.email, "customer.updated", slug, {
    section: "identity",
    diff: parsed.data,
  });
  revalidatePath(`/admin/customers/${slug}/settings`);
  return { ok: true };
}

export async function updateBillingAction(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireWcnAdmin();
  const parsed = billingSchema.safeParse({
    billing_contact_name: formData.get("billing_contact_name") ?? "",
    billing_contact_email: formData.get("billing_contact_email") ?? "",
    technical_contact_name: formData.get("technical_contact_name") ?? "",
    technical_contact_email: formData.get("technical_contact_email") ?? "",
    billing_address: formData.get("billing_address") ?? "",
    vat_number: formData.get("vat_number") ?? "",
    go_live_date: formData.get("go_live_date") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const customer = await getCustomer(slug);
  if (!customer) return { error: "Customer not found" };
  await updateCustomer(slug, parsed.data);
  await writeAudit(session.appUser.email, "customer.updated", slug, {
    section: "billing",
  });
  revalidatePath(`/admin/customers/${slug}/settings`);
  return { ok: true };
}

export async function archiveCustomerAction(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireWcnAdmin();
  if (formData.get("confirm_slug") !== slug) {
    return { error: "Confirmation slug does not match." };
  }
  const customer = await getCustomer(slug);
  if (!customer) return { error: "Customer not found" };
  await archiveCustomer(slug);
  await writeAudit(session.appUser.email, "customer.archived", slug, {});
  revalidatePath(`/admin/customers/${slug}/settings`);
  return { ok: true };
}

export async function unarchiveCustomerAction(
  slug: string,
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await requireWcnAdmin();
  const customer = await getCustomer(slug);
  if (!customer) return { error: "Customer not found" };
  await unarchiveCustomer(slug);
  await writeAudit(session.appUser.email, "customer.unarchived", slug, {});
  revalidatePath(`/admin/customers/${slug}/settings`);
  return { ok: true };
}

export async function deprovisionVmAction(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireWcnAdmin();
  if (formData.get("confirm_slug") !== slug) {
    return { error: "Confirmation slug does not match." };
  }
  const customer = await getCustomer(slug);
  if (!customer) return { error: "Customer not found" };

  let jobId: string;
  try {
    const job = await startDeprovision(slug, false);
    jobId = job.jobId;
    await setLastJobId(slug, jobId);
    await writeAudit(session.appUser.email, "deprovision.started", slug, {
      jobId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await writeAudit(session.appUser.email, "deprovision.trigger_failed", slug, {
      error: msg,
    });
    return { error: `Failed to start deprovision: ${msg}` };
  }

  redirect(`/admin/customers/${slug}/jobs/${jobId}`);
}
