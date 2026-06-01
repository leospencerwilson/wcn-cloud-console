"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Tier } from "@/lib/db/tiers";
import { updateTierAction, type UpdateTierState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export default function EditTierForm({ tier }: { tier: Tier }) {
  const [state, formAction] = useActionState<UpdateTierState, FormData>(
    updateTierAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-7">
      <input type="hidden" name="id" value={tier.id} />

      {state?.error && (
        <div
          className="px-4 py-3 text-[13px] leading-[1.5] border"
          style={{
            color: "var(--color-danger, #b3261e)",
            borderColor: "var(--color-danger, #b3261e)",
            background: "var(--color-danger-bg, #fdecea)",
          }}
        >
          {state.error}
        </div>
      )}
      {state?.ok && (
        <div
          className="px-4 py-3 text-[13px] leading-[1.5] border"
          style={{
            color: "var(--color-success, #1f7a3a)",
            borderColor: "var(--color-success, #1f7a3a)",
          }}
        >
          Saved.
        </div>
      )}

      <div>
        <Label>Slug</Label>
        <Input value={tier.id} disabled readOnly className="type-mono" />
        <p
          className="text-[12px] mt-2 leading-[1.5]"
          style={{ color: "var(--color-muted)" }}
        >
          Slug is immutable after creation.
        </p>
      </div>

      <div>
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          defaultValue={tier.display_name}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="vcpu">vCPU</Label>
          <Input
            id="vcpu"
            name="vcpu"
            type="number"
            min={1}
            required
            defaultValue={tier.vcpu}
          />
        </div>
        <div>
          <Label htmlFor="ram_mb">RAM (MB)</Label>
          <Input
            id="ram_mb"
            name="ram_mb"
            type="number"
            min={1}
            required
            defaultValue={tier.ram_mb}
          />
        </div>
        <div>
          <Label htmlFor="disk_gb">Disk (GB)</Label>
          <Input
            id="disk_gb"
            name="disk_gb"
            type="number"
            min={1}
            required
            defaultValue={tier.disk_gb}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="price_gbp_monthly">Price (£/month)</Label>
        <Input
          id="price_gbp_monthly"
          name="price_gbp_monthly"
          type="number"
          min={0}
          required
          defaultValue={tier.price_gbp_monthly}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="backup_cadence">Backup cadence</Label>
          <Input
            id="backup_cadence"
            name="backup_cadence"
            required
            defaultValue={tier.backup_cadence}
          />
        </div>
        <div>
          <Label htmlFor="sla">SLA</Label>
          <Input id="sla" name="sla" required defaultValue={tier.sla} />
        </div>
      </div>

      <div className="pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
