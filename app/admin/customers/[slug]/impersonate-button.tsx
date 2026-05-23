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
          className="modal-backdrop"
          onClick={() => !starting && setOpen(false)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="type-eyebrow">§ VIEW AS {customerName.toUpperCase()}</span>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-[13.5px] leading-[1.55]" style={{ color: "var(--text-2)" }}>
                You&apos;ll see the customer dashboard as they see it. All
                mutation buttons are disabled. Start and exit are written to
                the audit log.
              </p>
              <label className="block">
                <span
                  className="type-mono"
                  style={{
                    display: "block",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-3)",
                    marginBottom: 6,
                  }}
                >
                  Note (optional, audited)
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 500))}
                  rows={3}
                  className="field-input"
                  placeholder="Debugging ticket #1234"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}
                />
                <span
                  className="type-mono"
                  style={{
                    display: "block",
                    marginTop: 4,
                    fontSize: 10.5,
                    color: "var(--text-4)",
                    textAlign: "right",
                  }}
                >
                  {note.length}/500
                </span>
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
            <div className="modal-footer">
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
