"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@/components/ui/icons";
import { createTierAction, type CreateTierState } from "./actions";

const slugRegex = /^[a-z0-9-]{2,40}$/;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <IconPlus />
      {pending ? "Creating…" : "Create tier"}
    </Button>
  );
}

export default function NewTierForm() {
  const [state, formAction] = useActionState<CreateTierState, FormData>(
    createTierAction,
    undefined,
  );

  const [id, setId] = useState("");
  const slugValid = id === "" ? true : slugRegex.test(id);

  return (
    <form action={formAction} className="space-y-7">
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

      <div>
        <Label htmlFor="id">Slug</Label>
        <Input
          id="id"
          name="id"
          required
          pattern="^[a-z0-9-]{2,40}$"
          placeholder="enterprise"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <p
          className="text-[12px] mt-3 leading-[1.5]"
          style={{ color: "var(--color-muted)" }}
        >
          Immutable after creation. 2–40 chars: lowercase letters, digits, hyphens.
        </p>
        {!slugValid && (
          <p
            className="text-[12px] mt-2 leading-[1.5]"
            style={{ color: "var(--color-danger, #b3261e)" }}
          >
            Use 2–40 lowercase letters, digits or hyphens.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" required placeholder="Enterprise" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="vcpu">vCPU</Label>
          <Input id="vcpu" name="vcpu" type="number" min={1} required defaultValue={2} />
        </div>
        <div>
          <Label htmlFor="ram_mb">RAM (MB)</Label>
          <Input
            id="ram_mb"
            name="ram_mb"
            type="number"
            min={1}
            required
            defaultValue={4096}
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
            defaultValue={40}
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
          defaultValue={49}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="backup_cadence">Backup cadence</Label>
          <Input
            id="backup_cadence"
            name="backup_cadence"
            defaultValue="nightly"
          />
        </div>
        <div>
          <Label htmlFor="sla">SLA</Label>
          <Input id="sla" name="sla" defaultValue="best-effort" />
        </div>
      </div>

      <div className="pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
