"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { statusPill } from "@/lib/utils";
import type { VmBackup } from "@/lib/provisioner/vms-client";

function fmtBytes(n: number | null): string {
  if (n === null || n === undefined) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

export default function BackupsTable({
  slug,
  canTrigger = true,
}: {
  slug: string;
  canTrigger?: boolean;
}) {
  const [rows, setRows] = useState<VmBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/backups`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setRows((await res.json()) as VmBackup[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Poll while any backup is running/queued.
  useEffect(() => {
    const inFlight = rows.some((r) => r.status === "running" || r.status === "queued");
    if (!inFlight) return;
    const t = setInterval(fetchRows, 6000);
    return () => clearInterval(t);
  }, [rows, fetchRows]);

  async function onTrigger() {
    setTriggering(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/backups`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
      } else {
        fetchRows();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">§ VM BACKUPS</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchRows}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {canTrigger && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onTrigger}
              disabled={triggering}
            >
              {triggering ? "Queuing…" : "Run backup now"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          className="px-6 py-3 type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      )}

      {rows.length === 0 && !loading ? (
        <p
          className="px-6 py-6 type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          No backups recorded yet.
        </p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ color: "var(--color-muted)" }}>
              <th className="text-left px-6 py-2 type-eyebrow">Started</th>
              <th className="text-left px-6 py-2 type-eyebrow">Duration</th>
              <th className="text-left px-6 py-2 type-eyebrow">Size</th>
              <th className="text-left px-6 py-2 type-eyebrow">Status</th>
              <th className="text-left px-6 py-2 type-eyebrow">Object</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.id}
                className="border-t"
                style={{ borderColor: "var(--color-hairline)" }}
              >
                <td className="px-6 py-3 type-mono text-[12px]">
                  {new Date(b.started_at).toLocaleString()}
                </td>
                <td
                  className="px-6 py-3 type-mono text-[12px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  {fmtDuration(b.started_at, b.finished_at)}
                </td>
                <td className="px-6 py-3 type-mono text-[12px]">{fmtBytes(b.size_bytes)}</td>
                <td className="px-6 py-3">
                  <span className={statusPill(b.status)}>{b.status}</span>
                </td>
                <td
                  className="px-6 py-3 type-mono text-[11px]"
                  style={{ color: "var(--color-muted)", wordBreak: "break-all" }}
                >
                  {b.b2_key ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
