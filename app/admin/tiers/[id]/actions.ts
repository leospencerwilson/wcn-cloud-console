"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireWcnAdmin } from "@/lib/auth/session";
import {
  archiveTier,
  countCustomersOnTier,
  getTier,
  updateTier,
} from "@/lib/db/tiers";
import { writeAudit } from "@/lib/db/customers";

const updateSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1, "Display name is required").max(120),
  vcpu: z.coerce.number().int().positive("vCPU must be > 0"),
  ram_mb: z.coerce.number().int().positive("RAM must be > 0"),
  disk_gb: z.coerce.number().int().positive("Disk must be > 0"),
  price_gbp_monthly: z.coerce.number().int().nonnegative("Price must be ≥ 0"),
  backup_cadence: z.string().min(1).max(60),
  sla: z.string().min(1).max(60),
});

export type UpdateTierState = { error?: string; ok?: boolean } | undefined;

export async function updateTierAction(
  _prev: UpdateTierState,
  formData: FormData,
): Promise<UpdateTierState> {
  const session = await requireWcnAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    display_name: formData.get("display_name"),
    vcpu: formData.get("vcpu"),
    ram_mb: formData.get("ram_mb"),
    disk_gb: formData.get("disk_gb"),
    price_gbp_monthly: formData.get("price_gbp_monthly"),
    backup_cadence: formData.get("backup_cadence"),
    sla: formData.get("sla"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const existing = await getTier(parsed.data.id);
  if (!existing) return { error: `Tier "${parsed.data.id}" not found.` };

  try {
    const { id, ...patch } = parsed.data;
    await updateTier(id, patch);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Failed to update tier: ${msg}` };
  }

  await writeAudit(session.appUser.email, "tier.updated", null, {
    id: parsed.data.id,
  });

  revalidatePath(`/admin/tiers/${parsed.data.id}`);
  revalidatePath(`/admin/tiers`);
  return { ok: true };
}

export async function archiveTierAction(formData: FormData): Promise<void> {
  const session = await requireWcnAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const tier = await getTier(id);
  if (!tier || tier.archived) {
    redirect(`/admin/tiers`);
  }

  const count = await countCustomersOnTier(id);
  if (count > 0) {
    redirect(`/admin/tiers/${encodeURIComponent(id)}?archive_error=in_use`);
  }

  await archiveTier(id);
  await writeAudit(session.appUser.email, "tier.archived", null, { id });
  redirect(`/admin/tiers`);
}
