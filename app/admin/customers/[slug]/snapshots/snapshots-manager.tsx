"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconCamera, IconRefresh, IconTrash, IconX, IconCheck } from "@/components/ui/icons";
import type { VmSnapshot } from "@/lib/provisioner/vms-client";

const NAME_RE = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;

function formatSnaptime(t: number): string {
  if (!t) return "—";
  const d = new Date(t * 1000);
  return d.toLocaleString();
}

export default function SnapshotsManager({ slug }: { slug: string }) {
  const [snaps, setSnaps] = useState<VmSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [taking, setTaking] = useState(false);

  const [confirmRevert, setConfirmRevert] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [reverting, setReverting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSnaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/snapshots`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setSnaps((await res.json()) as VmSnapshot[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSnaps();
  }, [fetchSnaps]);

  async function onTake(e: React.FormEvent) {
    e.preventDefault();
    if (!NAME_RE.test(name)) {
      setError("Snapshot name must start with a letter, ≤40 chars, [A-Za-z0-9_-].");
      return;
    }
    setTaking(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/snapshots`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, label: label || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setName("");
      setLabel("");
      // Snapshot creation is async; refresh shortly after.
      setTimeout(fetchSnaps, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setTaking(false);
    }
  }

  async function onRevertConfirm() {
    if (!confirmRevert) return;
    if (confirmInput !== confirmRevert) {
      setError("Snapshot name didn't match.");
      return;
    }
    setReverting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/vm/snapshots/${encodeURIComponent(confirmRevert)}/revert`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setConfirmRevert(null);
      setConfirmInput("");
      setTimeout(fetchSnaps, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setReverting(false);
    }
  }

  async function onDelete(snapName: string) {
    if (!confirm(`Delete snapshot "${snapName}"?`)) return;
    setDeleting(snapName);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/vm/snapshots/${encodeURIComponent(snapName)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setTimeout(fetchSnaps, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ TAKE SNAPSHOT</span>
        </div>
        <form onSubmit={onTake} className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="pre-upgrade-2026-05-22"
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Description (optional)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="before php 8.3 rollout"
            />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={taking}>
              <IconCamera />
              {taking ? "Taking…" : "Take snapshot"}
            </button>
          </div>
        </form>
      </Card>

      {error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      )}

      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ SNAPSHOTS</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchSnaps}>
            <IconRefresh />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {snaps.length === 0 && !loading ? (
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No snapshots yet.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">Name</th>
                <th className="text-left px-6 py-2 type-eyebrow">Taken</th>
                <th className="text-left px-6 py-2 type-eyebrow">Description</th>
                <th className="text-left px-6 py-2 type-eyebrow">RAM</th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {snaps.map((s) => (
                <tr
                  key={s.name}
                  className="border-t"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-6 py-3 type-mono text-[12px]">{s.name}</td>
                  <td className="px-6 py-3 type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {formatSnaptime(s.snaptime)}
                  </td>
                  <td
                    className="px-6 py-3 type-mono text-[11px]"
                    style={{ color: "var(--color-muted)", wordBreak: "break-all" }}
                  >
                    {s.description ?? "—"}
                  </td>
                  <td className="px-6 py-3 type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {s.vmstate ? "included" : "none"}
                  </td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setConfirmRevert(s.name);
                        setConfirmInput("");
                      }}
                    >
                      <IconRefresh />
                      Revert
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={deleting !== null}
                      onClick={() => onDelete(s.name)}
                      style={{ color: "var(--color-danger, #b03020)" }}
                    >
                      <IconTrash />
                      {deleting === s.name ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {confirmRevert && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}
          onClick={() => !reverting && setConfirmRevert(null)}
        >
          <Card>
            <div
              className="px-6 py-5 space-y-4 max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="type-eyebrow">§ REVERT SNAPSHOT</p>
                <p
                  className="mt-2 type-mono text-[12px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  Reverting will discard all changes made after this snapshot was taken.
                  The VM will be rolled back immediately and may restart. Type{" "}
                  <code style={{ color: "var(--color-ink)" }}>{confirmRevert}</code> to confirm.
                </p>
              </div>
              <input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full type-mono text-[13px] px-3 py-2"
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 2,
                }}
                placeholder={confirmRevert}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirmRevert(null)}
                  disabled={reverting}
                >
                  <IconX />
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onRevertConfirm}
                  disabled={reverting || confirmInput !== confirmRevert}
                  style={{ background: "var(--color-danger, #b03020)" }}
                >
                  <IconCheck />
                  {reverting ? "Reverting…" : "Confirm revert"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
