"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconRefresh, IconChevronLeft } from "@/components/ui/icons";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[apps/[id] segment error]", error);
  }, [error]);

  return (
    <section
      className="surface-card"
      style={{ padding: "22px 24px", maxWidth: 640 }}
    >
      <p
        className="type-eyebrow"
        style={{ color: "var(--crit)", marginBottom: 8 }}
      >
        § APP TEMPORARILY UNAVAILABLE
      </p>
      <p style={{ fontSize: 13.5, color: "var(--text-2)", marginBottom: 6 }}>
        The provisioner couldn&apos;t finish loading this app. This usually
        happens during an in-flight Coolify deploy — the app itself is
        unaffected. Wait a few seconds and retry.
      </p>
      <p
        className="type-mono"
        style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 16 }}
      >
        {error.message}
        {error.digest ? ` · ${error.digest}` : ""}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
          <IconRefresh />
          Retry
        </button>
        <Link href="/dashboard/apps" className="btn btn-ghost btn-sm">
          <IconChevronLeft />
          Back to apps
        </Link>
      </div>
    </section>
  );
}
