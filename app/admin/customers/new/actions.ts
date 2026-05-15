"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWcnAdmin } from "@/lib/auth/session";
import { createCustomer, writeAudit } from "@/lib/db/customers";

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
  redirect("/admin/customers");
}
