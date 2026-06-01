"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  archiveCustomerAction,
  unarchiveCustomerAction,
  deprovisionVmAction,
  type ActionState,
} from "./actions";

const DANGER = "#c0392b";

export default function DangerZone({
  slug,
  archived,
}: {
  slug: string;
  archived: boolean;
}) {
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <Card>
        <CardContent className="pt-8">
          <div className="flex items-center justify-between">
            <p
              className="type-mono text-[12px]"
              style={{ color: "var(--color-muted)" }}
            >
              Destructive controls hidden.
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShow(true)}
            >
              Show danger zone
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ borderColor: DANGER, borderWidth: 1, borderStyle: "solid" }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle style={{ color: DANGER }}>Danger zone</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShow(false)}
          >
            Hide
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <ArchiveBlock slug={slug} archived={archived} />
        <div
          style={{
            borderTop: "1px solid var(--color-hairline)",
            paddingTop: 24,
          }}
        >
          <DeprovisionBlock slug={slug} />
        </div>
      </CardContent>
    </Card>
  );
}

function ArchiveBlock({ slug, archived }: { slug: string; archived: boolean }) {
  if (archived) {
    return (
      <UnarchiveForm slug={slug} />
    );
  }
  return <ArchiveForm slug={slug} />;
}

function ArchiveForm({ slug }: { slug: string }) {
  const action = archiveCustomerAction.bind(null, slug);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );
  const [confirm, setConfirm] = useState("");
  const matches = confirm === slug;

  return (
    <form action={formAction} className="space-y-3">
      <h4 className="type-h3" style={{ color: DANGER }}>
        Archive customer
      </h4>
      <p
        className="type-mono text-[12px]"
        style={{ color: "var(--color-muted)" }}
      >
        Marks the customer as archived. No data is deleted. Type the slug{" "}
        <code className="type-mono">{slug}</code> below to enable.
      </p>
      {state?.error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b3261e)" }}
        >
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="archive_confirm">Confirm slug</Label>
        <Input
          id="archive_confirm"
          name="confirm_slug"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={slug}
          autoComplete="off"
        />
      </div>
      <DangerSubmit label="Archive customer" disabled={!matches} />
    </form>
  );
}

function UnarchiveForm({ slug }: { slug: string }) {
  const action = unarchiveCustomerAction.bind(null, slug);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );
  return (
    <form action={formAction} className="space-y-3">
      <h4 className="type-h3">Restore customer</h4>
      <p
        className="type-mono text-[12px]"
        style={{ color: "var(--color-muted)" }}
      >
        Currently archived. Restoring clears the archive flag.
      </p>
      {state?.error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b3261e)" }}
        >
          {state.error}
        </p>
      )}
      <UnarchiveSubmit />
    </form>
  );
}

function DeprovisionBlock({ slug }: { slug: string }) {
  const action = deprovisionVmAction.bind(null, slug);
  const [state, formAction] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );
  const [confirm, setConfirm] = useState("");
  const matches = confirm === slug;

  return (
    <form action={formAction} className="space-y-3">
      <h4 className="type-h3" style={{ color: DANGER }}>
        Deprovision VM
      </h4>
      <p
        className="type-mono text-[12px]"
        style={{ color: "var(--color-muted)" }}
      >
        Destroys the VM, tunnel and DNS records. Irreversible. Type the slug{" "}
        <code className="type-mono">{slug}</code> below to enable. Redirects to
        the job log on submit.
      </p>
      {state?.error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b3261e)" }}
        >
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="deprovision_confirm">Confirm slug</Label>
        <Input
          id="deprovision_confirm"
          name="confirm_slug"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={slug}
          autoComplete="off"
        />
      </div>
      <DangerSubmit label="Deprovision VM" disabled={!matches} />
    </form>
  );
}

function DangerSubmit({
  label,
  disabled,
}: {
  label: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="danger"
      disabled={disabled || pending}
    >
      {pending ? "Working…" : label}
    </Button>
  );
}

function UnarchiveSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Restoring…" : "Restore customer"}
    </Button>
  );
}
