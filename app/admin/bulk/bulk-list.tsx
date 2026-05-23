"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { BulkJob, BulkJobStatus } from "@/lib/provisioner/types";

const POLL_MS = 2000;

const STATUS_COLORS: Record<BulkJobStatus, string> = {
  pending: "var(--color-muted)",
  running: "var(--color-warning, #b07020)",
  succeeded: "var(--color-success, #2f6b3a)",
  partial: "var(--color-warning, #b07020)",
  failed: "var(--color-danger, #b03020)",
  aborted: "var(--color-danger, #b03020)",
};

type Filter = "all" | "active" | "completed";

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function targetCount(job: BulkJob): number {
  if (typeof job.target_count === "number") return job.target_count;
  if (Array.isArray(job.targets)) return job.targets.length;
  if (Array.isArray(job.runs)) return job.runs.length;
  return 0;
}

export default function BulkList({
  initial,
  initialError,
}: {
  initial: BulkJob[];
  initialError: string | null;
}) {
  const [jobs, setJobs] = useState<BulkJob[]>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [filter, setFilter] = useState<Filter>("all");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bulk?limit=50", { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setError(null);
      setJobs((await res.json()) as BulkJob[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }, []);

  const hasActive = useMemo(
    () => jobs.some((j) => j.status === "running" || j.status === "pending"),
    [jobs],
  );

  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [hasActive, refresh]);

  const filtered = useMemo(() => {
    if (filter === "active")
      return jobs.filter((j) => j.status === "running" || j.status === "pending");
    if (filter === "completed")
      return jobs.filter(
        (j) =>
          j.status === "succeeded" ||
          j.status === "partial" ||
          j.status === "failed" ||
          j.status === "aborted",
      );
    return jobs;
  }, [jobs, filter]);

  return (
    <Card>
      <div
        className="px-6 py-3 border-b flex items-center justify-between gap-3 flex-wrap"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <div className="flex items-center gap-1">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {hasActive && (
            <span
              className="type-mono text-[11px]"
              style={{ color: "var(--color-warning, #b07020)" }}
            >
              ● live · 2s
            </span>
          )}
          {error && (
            <span
              className="type-mono text-[11px]"
              style={{ color: "var(--color-danger, #b03020)" }}
            >
              {error}
            </span>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p
          className="px-6 py-8 type-mono text-[12px] text-center"
          style={{ color: "var(--color-muted)" }}
        >
          No jobs.
        </p>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr
              className="type-eyebrow text-[10px] border-b"
              style={{ borderColor: "var(--color-hairline)" }}
            >
              <th className="px-6 py-2 text-left">ID</th>
              <th className="px-6 py-2 text-left">Operation</th>
              <th className="px-6 py-2 text-left">Targets</th>
              <th className="px-6 py-2 text-left">Status</th>
              <th className="px-6 py-2 text-left">Started</th>
              <th className="px-6 py-2 text-left">Actor</th>
              <th className="px-6 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => {
              const succ = j.runs?.filter((r) => r.status === "succeeded").length ?? 0;
              const fail = j.runs?.filter((r) => r.status === "failed").length ?? 0;
              const total = targetCount(j);
              return (
                <tr
                  key={j.id}
                  className="border-b"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-6 py-3 type-mono">#{j.id}</td>
                  <td className="px-6 py-3 type-mono">
                    {j.operation}
                    {j.dry_run && (
                      <span
                        className="ml-2 text-[10px]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        DRY
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 type-mono">
                    {total}
                    {total > 0 && j.runs?.length ? (
                      <span style={{ color: "var(--color-muted)" }}>
                        {" "}
                        · {succ}✓ {fail > 0 ? `${fail}✗` : ""}
                      </span>
                    ) : null}
                  </td>
                  <td
                    className="px-6 py-3 type-mono"
                    style={{ color: STATUS_COLORS[j.status] }}
                  >
                    ● {j.status}
                    {j.abort_requested && j.status === "running" && (
                      <span
                        className="ml-2 text-[10px]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        aborting…
                      </span>
                    )}
                  </td>
                  <td
                    className="px-6 py-3 type-mono"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {relTime(j.started_at || j.created_at)}
                  </td>
                  <td
                    className="px-6 py-3 type-mono"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {j.actor}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link
                      href={`/admin/bulk/${j.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
