"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IconSave } from "@/components/ui/icons";
import { updateIdentityAction, type ActionState } from "./actions";

interface Props {
  slug: string;
  initial: { name: string; tier: string; contact_email: string };
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <IconSave />
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export default function IdentityForm({ slug, initial }: Props) {
  const action = updateIdentityAction.bind(null, slug);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identity & contact</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <Banner state={state} />
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" name="name" required defaultValue={initial.name} />
          </div>
          <div>
            <Label htmlFor="tier">Tier</Label>
            <select
              id="tier"
              name="tier"
              required
              className="field-select"
              defaultValue={initial.tier}
            >
              <option value="site">site</option>
              <option value="site-db">site-db</option>
              <option value="pro">pro</option>
            </select>
          </div>
          <div>
            <Label htmlFor="contact_email">Primary email</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              required
              defaultValue={initial.contact_email}
            />
          </div>
          <div className="pt-2">
            <Submit />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Banner({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <div
        className="px-4 py-3 text-[13px] border"
        style={{
          color: "var(--color-danger, #b3261e)",
          borderColor: "var(--color-danger, #b3261e)",
          background: "var(--color-danger-bg, #fdecea)",
        }}
      >
        {state.error}
      </div>
    );
  }
  if (state.ok) {
    return (
      <div
        className="px-4 py-3 text-[13px] border"
        style={{
          color: "var(--color-success, #1f7a3a)",
          borderColor: "var(--color-success, #1f7a3a)",
          background: "rgba(40,90,40,0.08)",
        }}
      >
        Saved
      </div>
    );
  }
  return null;
}
