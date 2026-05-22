"use client";

import { useState } from "react";

export default function ImpersonateButton({
  slug,
  customerName,
}: {
  slug: string;
  customerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/impersonate/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer_slug: slug, note: note || undefined }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(true)}
        style={{ color: "var(--color-navy)" }}
      >
        View as customer →
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,20,20,0.45)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              maxWidth: 460,
              width: "100%",
              background: "var(--color-ivory)",
              border: "1px solid var(--color-hairline)",
              borderRadius: 2,
            }}
          >
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: "var(--color-hairline)" }}
            >
              <span className="type-eyebrow">§ VIEW AS {customerName.toUpperCase()}</span>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-[14px] leading-[1.55]" style={{ color: "var(--color-charcoal)" }}>
                You&apos;ll see the customer dashboard as they see it. All
                mutation buttons are disabled. Start and exit are written to
                the audit log.
              </p>
              <label className="block space-y-1">
                <span className="type-eyebrow text-[10px]">Note (optional, audited)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full type-mono text-[13px] px-3 py-2"
                  placeholder="Debugging ticket #1234"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 2,
                  }}
                />
              </label>
              {error && (
                <p
                  className="type-mono text-[12px]"
                  style={{ color: "var(--color-danger, #b03020)" }}
                >
                  {error}
                </p>
              )}
            </div>
            <div
              className="px-6 py-4 border-t flex items-center justify-end gap-3"
              style={{ borderColor: "var(--color-hairline)" }}
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                disabled={starting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onStart}
                disabled={starting}
              >
                {starting ? "Starting…" : "Start impersonation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
