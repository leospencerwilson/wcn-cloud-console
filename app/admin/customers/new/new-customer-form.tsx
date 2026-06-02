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

/** Availability indicator shown inside the slug input, on the right. */
function SlugStatus({ state }: { state: Availability["state"] }) {
  if (state === "idle") return null;

  const wrap = (node: React.ReactNode, label: string) => (
    <span
      title={label}
      aria-label={label}
      role="img"
      style={{
        position: "absolute",
        right: 9,
        top: "50%",
        transform: "translateY(-50%)",
        display: "inline-flex",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {node}
    </span>
  );

  if (state === "checking") {
    return wrap(<span className="slug-spinner" />, "Checking availability…");
  }

  if (state === "available") {
    return wrap(
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="var(--ok)" />
        <path
          d="M7 12.5l3.2 3.2L17 9"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>,
      "Slug available",
    );
  }

  const tone = state === "taken" ? "var(--crit)" : "var(--warn)";
  const label =
    state === "taken"
      ? "Slug already taken"
      : state === "invalid"
        ? "Invalid slug format"
        : "Couldn’t verify availability";
  const glyph =
    state === "taken" ? (
      <path
        d="M8.5 8.5l7 7M15.5 8.5l-7 7"
        stroke="var(--bg)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    ) : (
      <>
        <path
          d="M12 7v5.5"
          stroke="var(--bg)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16.5" r="1.25" fill="var(--bg)" />
      </>
    );

  return wrap(
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill={tone} />
      {glyph}
    </svg>,
    label,
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

  // The positive/checking states are now shown by the inline icon inside the
  // input; only problems get an explanatory line below.
  const belowMsg = (() => {
    if (availability.state === "taken")
      return { text: "That slug is already taken.", color: "var(--crit)" };
    if (availability.state === "invalid" || (!slugValid && slug !== ""))
      return {
        text: "Use 2–40 lowercase letters, digits or hyphens.",
        color: "var(--crit)",
      };
    if (availability.state === "error")
      return {
        text: "Couldn’t verify availability.",
        color: "var(--text-3)",
      };
    return null;
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
        <div style={{ position: "relative" }}>
          <Input
            id="slug"
            name="slug"
            required
            pattern="^[a-z0-9-]{2,40}$"
            placeholder="acme"
            value={slug}
            aria-invalid={
              availability.state === "taken" ||
              availability.state === "invalid" ||
              (!slugValid && slug !== "")
            }
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            style={{
              paddingRight: availability.state === "idle" ? undefined : 34,
            }}
          />
          <SlugStatus state={availability.state} />
        </div>
        <p
          className="text-[12px] mt-3 leading-[1.5]"
          style={{ color: "var(--color-muted)" }}
        >
          Subdomain preview:{" "}
          <code className="type-mono">
            {slug || "slug"}.western-communication.com
          </code>
        </p>
        {belowMsg && (
          <p
            className="text-[12px] mt-2 leading-[1.5]"
            style={{ color: belowMsg.color }}
          >
            {belowMsg.text}
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
