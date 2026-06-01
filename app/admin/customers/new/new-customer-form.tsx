"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TierSelect } from "@/components/tier-select";
import { createCustomerAction, type CreateCustomerState } from "./actions";

const slugRegex = /^[a-z0-9-]{2,40}$/;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type Availability =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "invalid" }
  | { state: "error" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create customer"}
    </Button>
  );
}

export default function NewCustomerForm() {
  const [state, formAction] = useActionState<CreateCustomerState, FormData>(
    createCustomerAction,
    undefined,
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const lastAutoSlug = useRef("");
  const [availability, setAvailability] = useState<Availability>({ state: "idle" });

  const slugValid = slug === "" ? true : slugRegex.test(slug);

  useEffect(() => {
    if (slugTouched) return;
    const next = slugify(name);
    if (slug === "" || slug === lastAutoSlug.current) {
      lastAutoSlug.current = next;
      setSlug(next);
    }
  }, [name, slug, slugTouched]);

  useEffect(() => {
    if (!slug) {
      setAvailability({ state: "idle" });
      return;
    }
    if (!slugRegex.test(slug)) {
      setAvailability({ state: "invalid" });
      return;
    }
    setAvailability({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/customers/check-slug?slug=${encodeURIComponent(slug)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!res.ok) {
          setAvailability({ state: "error" });
          return;
        }
        const data = (await res.json()) as { available: boolean; invalid?: boolean };
        if (data.invalid) setAvailability({ state: "invalid" });
        else setAvailability({ state: data.available ? "available" : "taken" });
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setAvailability({ state: "error" });
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  const availabilityMsg = (() => {
    switch (availability.state) {
      case "checking":
        return { text: "checking…", color: "var(--color-muted)" };
      case "available":
        return { text: "✓ available", color: "var(--color-success, #1f7a3a)" };
      case "taken":
        return { text: "× already taken", color: "var(--color-danger, #b3261e)" };
      case "invalid":
        return {
          text: "Use 2–40 lowercase letters, digits or hyphens.",
          color: "var(--color-danger, #b3261e)",
        };
      case "error":
        return { text: "couldn’t verify availability", color: "var(--color-muted)" };
      default:
        return null;
    }
  })();

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
        <Label htmlFor="name">Company name</Label>
        <Input
          id="name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          required
          pattern="^[a-z0-9-]{2,40}$"
          placeholder="acme"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
        />
        <p
          className="text-[12px] mt-3 leading-[1.5]"
          style={{ color: "var(--color-muted)" }}
        >
          Subdomain preview:{" "}
          <code className="type-mono">
            {slug || "slug"}.western-communication.com
          </code>
        </p>
        {availabilityMsg && (
          <p
            className="text-[12px] mt-2 leading-[1.5]"
            style={{ color: availabilityMsg.color }}
          >
            {availabilityMsg.text}
          </p>
        )}
        {!slugValid && availability.state !== "invalid" && (
          <p
            className="text-[12px] mt-2 leading-[1.5]"
            style={{ color: "var(--color-danger, #b3261e)" }}
          >
            Use 2–40 lowercase letters, digits or hyphens.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="tier">Tier</Label>
        <TierSelect id="tier" name="tier" defaultValue="site" required />
      </div>

      <div>
        <Label htmlFor="contactEmail">Primary email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
        />
      </div>

      <div className="pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
