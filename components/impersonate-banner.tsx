"use client";

import { useEffect, useState } from "react";
import { IconX } from "@/components/ui/icons";

function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

export default function ImpersonateBanner({
  customerName,
  customerSlug,
  startedAt,
  note,
}: {
  customerName: string;
  customerSlug: string;
  startedAt: string;
  note?: string;
}) {
  const [exiting, setExiting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  void tick;

  async function onExit() {
    setExiting(true);
    try {
      await fetch("/api/admin/impersonate/stop", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = `/admin/customers/${customerSlug}`;
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in oklch, var(--warn) 18%, var(--bg-2))",
        borderBottom: "1px solid color-mix(in oklch, var(--warn) 45%, var(--line))",
        color: "var(--text)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 type-mono text-[12px]">
          <span aria-hidden style={{ color: "var(--warn)" }}>
            ▲
          </span>
          <span style={{ color: "var(--text)" }}>
            Viewing as <strong>{customerName}</strong>
            <span style={{ color: "var(--text-3)" }}>
              {" "}
              · started {ageLabel(startedAt)} · Read-only
            </span>
            {note && (
              <span style={{ color: "var(--text-3)" }}> · note: {note}</span>
            )}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onExit}
          disabled={exiting}
          style={{ color: "var(--color-navy)" }}
        >
          <IconX />
          {exiting ? "Exiting…" : "Exit impersonation"}
        </button>
      </div>
    </div>
  );
}
