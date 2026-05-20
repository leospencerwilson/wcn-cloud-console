"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWcnAdmin } from "@/lib/auth/session";
import { createCustomer, setLastJobId, writeAudit } from "@/lib/db/customers";
import { sendCustomerCreatedEmail } from "@/lib/email/send-customer-created";
import { startProvision } from "@/lib/provisioner/client";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

const schema = z.object({
  slug: z.string().regex(slugRegex, "Invalid slug"),
  name: z.string().min(1).max(120),
  tier: z.enum(["site", "site-db", "pro"]),
  contactEmail: z.string().email(),
});

export async function createCustomerAction(formData: FormData): Promise<void> {
  const session = await requireWcnAdmin();
  const parsed = schema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tier: formData.get("tier"),
    contactEmail: formData.get("contactEmail"),
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid input: ${parsed.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const customer = await createCustomer(parsed.data);
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

  // Kick off provisioning. If the trigger fails, the customer row stays in
  // 'provisioning' so an operator can retry from the customer page.
  let jobId: string | null = null;
  try {
    const job = await startProvision({
      slug: customer.slug,
      tier: customer.tier,
      name: customer.name,
      email: customer.contact_email,
      resume: true, // the row already exists from createCustomer()
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

  if (jobId) {
    redirect(`/admin/customers/${customer.slug}/jobs/${jobId}`);
  } else {
    redirect(`/admin/customers?error=provisioner_unreachable&slug=${customer.slug}`);
  }
}
