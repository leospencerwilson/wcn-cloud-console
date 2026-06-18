"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWcnAdmin } from "@/lib/auth/session";
import { createCustomer, getCustomer, setLastJobId, writeAudit } from "@/lib/db/customers";
import { sendCustomerCreatedEmail } from "@/lib/email/send-customer-created";
import { startProvision } from "@/lib/provisioner/client";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

const schema = z.object({
  slug: z.string().regex(slugRegex, "Invalid slug"),
  name: z.string().min(1).max(120),
  tier: z.enum(["site", "site-db", "pro"]),
  contactEmail: z.string().email(),
});

// Optional VM resources. Blank → provisioner defaults from the tier. Disk
// floors at the 60 GB template (grow-only). RAM entered in GB → converted to MB.
const numOrUndef = (v: FormDataEntryValue | null): number | undefined => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : Number(s);
};
const resourceSchema = z.object({
  cores: z.number().int().min(1).max(32).optional(),
  ramGb: z.number().int().min(1).max(64).optional(),
  diskGb: z.number().int().min(60).max(2000).optional(),
});

export type CreateCustomerState = { error?: string } | undefined;

export async function createCustomerAction(
  _prev: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  const session = await requireWcnAdmin();
  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tier: formData.get("tier"),
    contactEmail: formData.get("contactEmail"),
  });
  if (!parsed.success) {
    return {
      error: `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const resParsed = resourceSchema.safeParse({
    cores: numOrUndef(formData.get("cores")),
    ramGb: numOrUndef(formData.get("ram_gb")),
    diskGb: numOrUndef(formData.get("disk_gb")),
  });
  if (!resParsed.success) {
    return {
      error: `Invalid resources: ${resParsed.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const existing = await getCustomer(parsed.data.slug);
  if (existing) {
    return { error: `Slug "${parsed.data.slug}" is already taken.` };
  }

  let customer;
  try {
    customer = await createCustomer(parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Failed to create customer: ${msg}` };
  }

  await writeAudit(
    session.appUser.email,
    "customer.created",
    customer.slug,
    { tier: customer.tier, name: customer.name },
  );

  if (process.env.RESEND_API_KEY) {
    try {
      await sendCustomerCreatedEmail({
        to: customer.contact_email,
        customerName: customer.name,
        slug: customer.slug,
        tier: customer.tier,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[customer-created] email failed for ${customer.contact_email}: ${msg}`);
      await writeAudit(
        session.appUser.email,
        "customer.email_failed",
        customer.slug,
        { error: msg },
      );
    }
  }

  let jobId: string | null = null;
  try {
    const job = await startProvision({
      slug: customer.slug,
      tier: customer.tier,
      name: customer.name,
      email: customer.contact_email,
      resume: true,
      cores: resParsed.data.cores,
      memoryMb: resParsed.data.ramGb != null ? resParsed.data.ramGb * 1024 : undefined,
      diskGb: resParsed.data.diskGb,
    });
    jobId = job.jobId;
    await setLastJobId(customer.slug, job.jobId);
    await writeAudit(session.appUser.email, "provision.started", customer.slug, { jobId: job.jobId });
  } catch (err) {
    await writeAudit(
      session.appUser.email,
      "provision.trigger_failed",
      customer.slug,
      { error: err instanceof Error ? err.message : String(err) },
    );
  }

  redirect(`/admin/customers/${customer.slug}?provisioning=1`);
}
