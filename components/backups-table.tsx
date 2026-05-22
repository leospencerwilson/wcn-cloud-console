"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { statusPill } from "@/lib/utils";
import type { VmBackup } from "@/lib/provisioner/vms-client";
import LogStream from "@/components/log-stream";

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
  canDownload = false,
  canRestore = false,
}: {
  slug: string;
  canTrigger?: boolean;
  canDownload?: boolean;
  canRestore?: boolean;
}) {
  const [rows, setRows] = useState<VmBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadTarget, setDownloadTarget] = useState<VmBackup | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<VmBackup | null>(null);

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

  const showActions = canDownload || canRestore;

  return (
    <>
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
                {showActions && <th className="text-right px-6 py-2 type-eyebrow">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const ready = b.status === "succeeded" && !!b.b2_key;
                return (
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
                    {showActions && (
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        {canDownload && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDownloadTarget(b)}
                            disabled={!ready}
                          >
                            Download
                          </button>
                        )}
                        {canRestore && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm ml-2"
                            onClick={() => setRestoreTarget(b)}
                            disabled={!ready}
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {downloadTarget && (
        <DownloadModal
          slug={slug}
          backup={downloadTarget}
          onClose={() => setDownloadTarget(null)}
        />
      )}
      {restoreTarget && (
        <RestoreModal
          slug={slug}
          backup={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onStarted={fetchRows}
        />
      )}
    </>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: "var(--color-ivory, #f4f1ea)",
          border: "1px solid var(--color-hairline)",
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ {title}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function DownloadModal({
  slug,
  backup,
  onClose,
}: {
  slug: string;
  backup: VmBackup;
  onClose: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload(e: React.FormEvent) {
    e.preventDefault();
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/vm/backups/${backup.id}/download`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ passphrase }),
        },
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const dispo = res.headers.get("content-disposition") || "";
      const m = /filename="([^"]+)"/.exec(dispo);
      const filename = m?.[1] || `backup-${slug}-${backup.id}.sql.gz.gpg`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="DOWNLOAD ENCRYPTED BACKUP" onClose={onClose}>
      <form onSubmit={onDownload} className="space-y-4">
        <div className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
          Backup #{backup.id} · {new Date(backup.started_at).toLocaleString()}
          {backup.size_bytes !== null && ` · ${fmtBytes(backup.size_bytes)}`}
        </div>
        <p className="type-mono text-[12px]">
          The file is GPG-encrypted with a passphrase you choose now. Keep it safe — we
          cannot recover it.
        </p>
        <label className="block space-y-1">
          <span className="type-eyebrow text-[10px]">Passphrase (min 8 chars)</span>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
            className="w-full type-mono text-[13px] px-3 py-2"
            style={{
              background: "transparent",
              border: "1px solid var(--color-hairline)",
              borderRadius: 2,
            }}
          />
        </label>
        {error && (
          <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={busy || passphrase.length < 8}
          >
            {busy ? "Preparing…" : "Download"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RestoreModal({
  slug,
  backup,
  onClose,
  onStarted,
}: {
  slug: string;
  backup: VmBackup;
  onClose: () => void;
  onStarted: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  async function onRestore(e: React.FormEvent) {
    e.preventDefault();
    if (confirm !== slug) {
      setError(`Type "${slug}" exactly to confirm.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/vm/backups/${backup.id}/restore`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        job_uuid?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      if (data.job_uuid) {
        setJobId(data.job_uuid);
        onStarted();
      } else {
        setError("Restore queued, but no job id returned.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="RESTORE FROM BACKUP" onClose={onClose}>
      {jobId ? (
        <div className="space-y-3">
          <p className="type-mono text-[12px]">
            Restore job started · <span style={{ color: "var(--color-muted)" }}>{jobId}</span>
          </p>
          <LogStream
            source={{
              key: jobId,
              method: "GET",
              url: `/api/provision/${jobId}/stream`,
            }}
            height={360}
          />
          <div className="flex justify-end">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onRestore} className="space-y-4">
          <div className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
            Backup #{backup.id} · {new Date(backup.started_at).toLocaleString()}
            {backup.size_bytes !== null && ` · ${fmtBytes(backup.size_bytes)}`}
          </div>
          <p
            className="type-mono text-[12px] px-3 py-2"
            style={{
              border: "1px solid var(--color-danger, #b03020)",
              color: "var(--color-danger, #b03020)",
              borderRadius: 2,
            }}
          >
            DESTRUCTIVE — this will overwrite the current database for{" "}
            <strong>{slug}</strong>. There is no undo.
          </p>
          <label className="block space-y-1">
            <span className="type-eyebrow text-[10px]">
              Type the customer slug to confirm
            </span>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoFocus
              placeholder={slug}
              className="w-full type-mono text-[13px] px-3 py-2"
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
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={busy || confirm !== slug}
            >
              {busy ? "Starting…" : "Restore"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
