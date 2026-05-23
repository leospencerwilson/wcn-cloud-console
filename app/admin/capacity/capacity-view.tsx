"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type {
  CapacityNode,
  CapacityProjectionTier,
  CapacityReport,
} from "@/lib/provisioner/types";

const REFRESH_MS = 5 * 60 * 1000;

function pressureColor(p: number): string {
  if (p > 0.85) return "var(--color-danger, #b03020)";
  if (p > 0.70) return "var(--color-warning, #b07020)";
  return "var(--color-success, #2f6b3a)";
}

function fmtBytes(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  if (days >= 1) {
    const h = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${h}h`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function tierLabel(t: "small" | "medium" | "large"): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function PressureBar({
  label,
  pressure,
  used,
  total,
  detail,
}: {
  label: string;
  pressure: number;
  used: string;
  total: string;
  detail?: string;
}) {
  const pct = Math.max(0, Math.min(1, pressure));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="type-eyebrow text-[10px]">{label}</span>
        <span
          className="type-mono text-[11px]"
          style={{ color: "var(--color-muted)" }}
        >
          {used} / {total}
          {detail ? ` · ${detail}` : ""}
        </span>
      </div>
      <div
        className="relative h-2 w-full"
        style={{
          background: "var(--color-hairline)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            background: pressureColor(pct),
          }}
        />
      </div>
      <div className="type-mono text-[11px]" style={{ color: pressureColor(pct) }}>
        {(pct * 100).toFixed(0)}%
      </div>
    </div>
  );
}

function NodeCard({ node }: { node: CapacityNode }) {
  const memTotal = node.mem_total_bytes;
  const memUsed = node.mem_used_bytes;
  const cpuUsed = node.cpu_used_frac * node.cpu_cores;
  const storage = node.storage[0];
  const diskUsed = storage?.used_bytes ?? 0;
  const diskTotal = storage?.total_bytes ?? 0;
  const online = node.status === "online";
  return (
    <Card>
      <div
        className="px-6 py-3 border-b flex items-center justify-between gap-3 flex-wrap"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <div className="flex items-center gap-3">
          <span className="type-eyebrow">§ NODE · {node.node.toUpperCase()}</span>
          <span
            className="type-mono text-[11px]"
            style={{
              color: online
                ? "var(--color-success, #2f6b3a)"
                : "var(--color-danger, #b03020)",
            }}
          >
            ● {node.status}
          </span>
          <span
            className="type-mono text-[11px]"
            style={{ color: "var(--color-muted)" }}
          >
            uptime {fmtUptime(node.uptime_seconds)}
          </span>
        </div>
        <span
          className="type-mono text-[11px]"
          style={{ color: "var(--color-muted)" }}
        >
          {node.running_vms} running · {node.stopped_vms} stopped
        </span>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <PressureBar
          label="Memory"
          pressure={node.pressure.memory}
          used={fmtBytes(memUsed)}
          total={fmtBytes(memTotal)}
        />
        <PressureBar
          label="CPU"
          pressure={node.pressure.cpu}
          used={`${cpuUsed.toFixed(1)} cores`}
          total={`${node.cpu_cores} cores`}
        />
        <PressureBar
          label={storage ? `Disk · ${storage.name}` : "Disk"}
          pressure={node.pressure.disk}
          used={fmtBytes(diskUsed)}
          total={fmtBytes(diskTotal)}
        />
      </div>
      {node.storage.length > 1 && (
        <div
          className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 type-mono text-[11px]"
          style={{ color: "var(--color-muted)" }}
        >
          {node.storage.slice(1).map((s) => (
            <div key={s.name}>
              {s.name} ({s.type}) — {fmtBytes(s.used_bytes)} / {fmtBytes(s.total_bytes)}
            </div>
          ))}
        </div>
      )}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow text-[10px]">Fits more customers</span>
        <table className="mt-2 w-full text-[12px]">
          <tbody>
            {(["small", "medium", "large"] as const).map((tier) => {
              const p: CapacityProjectionTier = node.projection[tier];
              return (
                <tr key={tier}>
                  <td
                    className="py-1 type-mono"
                    style={{ width: 80, color: "var(--color-muted)" }}
                  >
                    {tierLabel(tier)}
                  </td>
                  <td className="py-1 type-mono" style={{ width: 40 }}>
                    {p.fits}
                  </td>
                  <td
                    className="py-1 type-mono"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {p.fits === 0 && p.limited_by
                      ? `limited by ${p.limited_by}`
                      : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function CapacityView({
  initial,
  initialError,
}: {
  initial: CapacityReport | null;
  initialError: string | null;
}) {
  const [report, setReport] = useState<CapacityReport | null>(initial);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/capacity", { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setReport((await res.json()) as CapacityReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  if (!report && error) {
    return (
      <Card>
        <p className="px-6 py-4 type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
          {error}
        </p>
        <div className="px-6 pb-4">
          <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
            Retry
          </button>
        </div>
      </Card>
    );
  }
  if (!report) return null;

  const total = report.aggregate.total_capacity_fits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="type-mono text-[11px]"
            style={{ color: "var(--color-muted)" }}
          >
            checked {new Date(report.checked_at).toLocaleString()}
          </span>
          {error && (
            <span
              className="type-mono text-[11px]"
              style={{ color: "var(--color-danger, #b03020)" }}
            >
              {error}
            </span>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={refresh}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {report.nodes.map((n) => (
        <NodeCard key={n.node} node={n} />
      ))}

      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ CLUSTER AGGREGATE</span>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2 type-mono text-[12px]">
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--color-muted)" }}>Total running</span>
              <span>{report.aggregate.total_running}</span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ color: "var(--color-muted)" }}>Total stopped</span>
              <span>{report.aggregate.total_stopped}</span>
            </div>
          </div>
          <div>
            <span className="type-eyebrow text-[10px]">Cluster headroom</span>
            <table className="mt-2 w-full text-[12px]">
              <tbody>
                {(["small", "medium", "large"] as const).map((t) => (
                  <tr key={t}>
                    <td
                      className="py-1 type-mono"
                      style={{ width: 80, color: "var(--color-muted)" }}
                    >
                      {tierLabel(t)}
                    </td>
                    <td className="py-1 type-mono">{total[t]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {report.customer_counts.length > 0 && (
          <div
            className="px-6 py-4 border-t"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow text-[10px]">Current customers</span>
            <div className="mt-2 flex items-center gap-4 flex-wrap type-mono text-[12px]">
              {report.customer_counts.map((c) => {
                const shape = report.tier_shapes[c.tier];
                return (
                  <span key={c.tier} style={{ color: "var(--color-muted)" }}>
                    {tierLabel(c.tier)}: <span style={{ color: "inherit" }}>{c.count}</span>
                    {shape && ` (${shape.cores}c/${shape.memory_mb}MB/${shape.disk_gb}GB)`}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
