"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { BulkJob, BulkRun, BulkRunStatus } from "@/lib/provisioner/types";
import { IconRefresh, IconStop } from "@/components/ui/icons";

const POLL_MS = 2000;

const RUN_COLORS: Record<BulkRunStatus, string> = {
  queued: "var(--color-muted)",
  running: "var(--color-warning, #b07020)",
  succeeded: "var(--color-success, #2f6b3a)",
  failed: "var(--color-danger, #b03020)",
  skipped: "var(--color-muted)",
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
}

function duration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(s) || !Number.isFinite(e)) return "—";
  const secs = Math.max(0, Math.floor((e - s) / 1000));
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

export default function BulkDetail({
  jobId,
  initial,
  initialError,
}: {
  jobId: number;
  initial: BulkJob | null;
  initialError: string | null;
}) {
  const [job, setJob] = useState<BulkJob | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [aborting, setAborting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/bulk/${jobId}`, { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setError(null);
      setJob((await res.json()) as BulkJob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }, [jobId]);

  const live = job?.status === "running" || job?.status === "pending";

  useEffect(() => {
    if (!live) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [live, refresh]);

  const abort = useCallback(async () => {
    if (!job) return;
    if (!confirm(`Abort job #${job.id}? In-flight runs will complete.`)) return;
    setAborting(true);
    try {
      const res = await fetch(`/api/admin/bulk/${jobId}/abort`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
      } else {
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setAborting(false);
    }
  }, [job, jobId, refresh]);

  const counts = useMemo(() => {
    if (!job?.runs) return null;
    const c = { queued: 0, running: 0, succeeded: 0, failed: 0, skipped: 0 };
    for (const r of job.runs) c[r.status]++;
    return c;
  }, [job]);

  if (!job && error) {
    return (
      <Card>
        <p
          className="px-6 py-4 type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      </Card>
    );
  }
  if (!job) return null;

  const targetTotal = job.target_count ?? job.targets?.length ?? job.runs?.length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <div
          className="px-6 py-3 border-b flex items-center justify-between gap-3 flex-wrap"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <div className="flex items-center gap-3">
            <span className="type-eyebrow">§ JOB</span>
            <span className="type-mono text-[12px]">{job.operation}</span>
            {job.dry_run && (
              <span
                className="type-mono text-[10px]"
                style={{ color: "var(--color-muted)" }}
              >
                DRY RUN
              </span>
            )}
            <span
              className="type-mono text-[12px]"
              style={{
                color:
                  job.status === "succeeded"
                    ? "var(--color-success, #2f6b3a)"
                    : job.status === "failed" || job.status === "aborted"
                      ? "var(--color-danger, #b03020)"
                      : "var(--color-warning, #b07020)",
              }}
            >
              ● {job.status}
            </span>
            {live && (
              <span
                className="type-mono text-[11px]"
                style={{ color: "var(--color-warning, #b07020)" }}
              >
                live · 2s
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {error && (
              <span
                className="type-mono text-[11px]"
                style={{ color: "var(--color-danger, #b03020)" }}
              >
                {error}
              </span>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
              <IconRefresh />
              Refresh
            </button>
            {live && !job.abort_requested && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={abort}
                disabled={aborting}
              >
                <IconStop />
                {aborting ? "Aborting…" : "Abort"}
              </button>
            )}
            {job.abort_requested && (
              <span
                className="type-mono text-[11px]"
                style={{ color: "var(--color-muted)" }}
              >
                abort requested
              </span>
            )}
          </div>
        </div>
        <div
          className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 type-mono text-[12px]"
        >
          <div>
            <span
              className="type-eyebrow text-[10px] block"
              style={{ color: "var(--color-muted)" }}
            >
              Actor
            </span>
            {job.actor}
          </div>
          <div>
            <span
              className="type-eyebrow text-[10px] block"
              style={{ color: "var(--color-muted)" }}
            >
              Created
            </span>
            {fmtTime(job.created_at)}
          </div>
          <div>
            <span
              className="type-eyebrow text-[10px] block"
              style={{ color: "var(--color-muted)" }}
            >
              Started
            </span>
            {fmtTime(job.started_at)}
          </div>
          <div>
            <span
              className="type-eyebrow text-[10px] block"
              style={{ color: "var(--color-muted)" }}
            >
              Finished
            </span>
            {fmtTime(job.finished_at)}
          </div>
        </div>
        {counts && (
          <div
            className="px-6 py-3 border-t flex items-center gap-4 type-mono text-[12px] flex-wrap"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span style={{ color: "var(--color-muted)" }}>
              {targetTotal} target{targetTotal === 1 ? "" : "s"}
            </span>
            <span style={{ color: RUN_COLORS.succeeded }}>{counts.succeeded} ok</span>
            <span style={{ color: RUN_COLORS.failed }}>{counts.failed} failed</span>
            <span style={{ color: RUN_COLORS.running }}>{counts.running} running</span>
            <span style={{ color: "var(--color-muted)" }}>
              {counts.queued} queued · {counts.skipped} skipped
            </span>
          </div>
        )}
      </Card>

      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ RUNS</span>
        </div>
        {!job.runs?.length ? (
          <p
            className="px-6 py-6 type-mono text-[12px] text-center"
            style={{ color: "var(--color-muted)" }}
          >
            No runs yet.
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr
                className="type-eyebrow text-[10px] border-b"
                style={{ borderColor: "var(--color-hairline)" }}
              >
                <th className="px-6 py-2 text-left">Slug</th>
                <th className="px-6 py-2 text-left">Status</th>
                <th className="px-6 py-2 text-left">Started</th>
                <th className="px-6 py-2 text-left">Duration</th>
                <th className="px-6 py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {job.runs.map((r: BulkRun) => (
                <tr
                  key={r.slug}
                  className="border-b"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-6 py-2 type-mono">{r.slug}</td>
                  <td
                    className="px-6 py-2 type-mono"
                    style={{ color: RUN_COLORS[r.status] }}
                  >
                    ● {r.status}
                  </td>
                  <td
                    className="px-6 py-2 type-mono"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {fmtTime(r.started_at)}
                  </td>
                  <td
                    className="px-6 py-2 type-mono"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {duration(r.started_at, r.finished_at)}
                  </td>
                  <td
                    className="px-6 py-2 type-mono"
                    style={{ color: r.error ? "var(--color-danger, #b03020)" : "var(--color-muted)" }}
                  >
                    {r.error
                      ? r.error
                      : r.result
                        ? typeof r.result === "string"
                          ? r.result
                          : JSON.stringify(r.result).slice(0, 80)
                        : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ TARGET FILTER</span>
        </div>
        <pre
          className="px-6 py-4 type-mono text-[11px] overflow-x-auto"
          style={{ color: "var(--color-muted)" }}
        >
          {JSON.stringify(job.target_filter, null, 2)}
        </pre>
        {Object.keys(job.args || {}).length > 0 && (
          <>
            <div
              className="px-6 py-3 border-t border-b"
              style={{ borderColor: "var(--color-hairline)" }}
            >
              <span className="type-eyebrow">§ ARGS</span>
            </div>
            <pre
              className="px-6 py-4 type-mono text-[11px] overflow-x-auto"
              style={{ color: "var(--color-muted)" }}
            >
              {JSON.stringify(job.args, null, 2)}
            </pre>
          </>
        )}
      </Card>
    </div>
  );
}
