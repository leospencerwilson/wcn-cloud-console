"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWcnAdmin } from "@/lib/auth/session";
import { createTier, getTier } from "@/lib/db/tiers";
import { writeAudit } from "@/lib/db/customers";

const slugRegex = /^[a-z0-9-]{2,40}$/;

const schema = z.object({
  id: z.string().regex(slugRegex, "Slug must be 2-40 chars: a-z, 0-9, hyphen"),
  display_name: z.string().min(1, "Display name is required").max(120),
  vcpu: z.coerce.number().int().positive("vCPU must be > 0"),
  ram_mb: z.coerce.number().int().positive("RAM must be > 0"),
  disk_gb: z.coerce.number().int().positive("Disk must be > 0"),
  price_gbp_monthly: z.coerce.number().int().nonnegative("Price must be ≥ 0"),
  backup_cadence: z.string().min(1).max(60).optional(),
  sla: z.string().min(1).max(60).optional(),
});

export type CreateTierState = { error?: string } | undefined;

export async function createTierAction(
  _prev: CreateTierState,
  formData: FormData,
): Promise<CreateTierState> {
  const session = await requireWcnAdmin();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    display_name: formData.get("display_name"),
    vcpu: formData.get("vcpu"),
    ram_mb: formData.get("ram_mb"),
    disk_gb: formData.get("disk_gb"),
    price_gbp_monthly: formData.get("price_gbp_monthly"),
    backup_cadence: formData.get("backup_cadence") || undefined,
    sla: formData.get("sla") || undefined,
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const existing = await getTier(parsed.data.id);
  if (existing) {
    return { error: `Tier "${parsed.data.id}" already exists.` };
  }

  try {
    await createTier(parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Failed to create tier: ${msg}` };
  }

  await writeAudit(session.appUser.email, "tier.created", null, {
    id: parsed.data.id,
    price_gbp_monthly: parsed.data.price_gbp_monthly,
  });

  redirect(`/admin/tiers`);
}
