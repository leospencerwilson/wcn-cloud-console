"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IconSave } from "@/components/ui/icons";
import { updateBillingAction, type ActionState } from "./actions";

interface Props {
  slug: string;
  initial: {
    billing_contact_name: string;
    billing_contact_email: string;
    technical_contact_name: string;
    technical_contact_email: string;
    billing_address: string;
    vat_number: string;
    go_live_date: string;
    notes: string;
  };
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

export default function BillingForm({ slug, initial }: Props) {
  const action = updateBillingAction.bind(null, slug);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & contacts</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <Banner state={state} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="billing_contact_name">Billing contact name</Label>
              <Input
                id="billing_contact_name"
                name="billing_contact_name"
                defaultValue={initial.billing_contact_name}
              />
            </div>
            <div>
              <Label htmlFor="billing_contact_email">Billing contact email</Label>
              <Input
                id="billing_contact_email"
                name="billing_contact_email"
                type="email"
                defaultValue={initial.billing_contact_email}
              />
            </div>
            <div>
              <Label htmlFor="technical_contact_name">Technical contact name</Label>
              <Input
                id="technical_contact_name"
                name="technical_contact_name"
                defaultValue={initial.technical_contact_name}
              />
            </div>
            <div>
              <Label htmlFor="technical_contact_email">Technical contact email</Label>
              <Input
                id="technical_contact_email"
                name="technical_contact_email"
                type="email"
                defaultValue={initial.technical_contact_email}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="billing_address">Billing address</Label>
            <textarea
              id="billing_address"
              name="billing_address"
              rows={4}
              className="field-input"
              defaultValue={initial.billing_address}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label htmlFor="vat_number">VAT number</Label>
              <Input
                id="vat_number"
                name="vat_number"
                defaultValue={initial.vat_number}
              />
            </div>
            <div>
              <Label htmlFor="go_live_date">Go-live date</Label>
              <Input
                id="go_live_date"
                name="go_live_date"
                type="date"
                defaultValue={initial.go_live_date}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Admin notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={5}
              className="field-input"
              defaultValue={initial.notes}
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
