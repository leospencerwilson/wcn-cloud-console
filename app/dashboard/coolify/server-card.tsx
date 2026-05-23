"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sparkline from "@/components/charts/sparkline";
import type { MetricPoint, MetricsResponse } from "@/lib/provisioner/types";

type Power = {
  state: "running" | "stopped" | "paused";
  qmpstatus: string;
  uptime: number;
  cpu: number;
  cpus: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  vmid: number;
  proxmox_node: string;
};

function fmtUptime(s: number): string {
  if (!s) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtGb(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function pickValues(series: MetricPoint[] | undefined): number[] {
  if (!series) return [];
  return series.map((p) => p.value).filter((v) => Number.isFinite(v));
}

function StatRow({
  label,
  pct,
  detail,
  values,
  color,
}: {
  label: string;
  pct: number;
  detail: string;
  values: number[];
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ padding: "8px 0" }}
    >
      <div
        className="type-mono"
        style={{
          width: 64,
          fontSize: 11,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-4)",
        }}
      >
        {label}
      </div>
      <div
        className="type-mono"
        style={{
          width: 44,
          fontSize: 13,
          color: "var(--text)",
        }}
      >
        {pct.toFixed(0)}%
      </div>
      <div style={{ flex: 1 }}>
        <Sparkline data={values} width={220} height={28} color={color} />
      </div>
      <div
        className="type-mono"
        style={{ fontSize: 11, color: "var(--text-3)" }}
      >
        {detail}
      </div>
    </div>
  );
}

export default function ServerCard({ slug }: { slug: string }) {
  const [power, setPower] = useState<Power | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/customers/${slug}/vm/power`, { cache: "no-store" }).then(
        (r) => r.json(),
      ),
      fetch(`/api/customers/${slug}/vm/metrics?window=1h&series=cpu,ram,disk`, {
        cache: "no-store",
      }).then((r) => r.json()),
    ])
      .then(([p, m]) => {
        if (!alive) return;
        if (p && (p as Power).state) setPower(p as Power);
        else
          setErr(
            ((p as { error?: string }).error as string) || "power failed",
          );
        setMetrics(m as MetricsResponse);
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "failed"));
    return () => {
      alive = false;
    };
  }, [slug]);

  const statePill =
    power?.state === "running"
      ? "pill-ok"
      : power?.state === "stopped"
        ? "pill-crit"
        : "pill-warn";

  return (
    <section className="surface-card" style={{ padding: "18px 22px" }}>
      <div
        className="flex items-center gap-3 flex-wrap"
        style={{ marginBottom: 14 }}
      >
        <div className="type-h3">Server</div>
        {power && (
          <>
            <span className={statePill}>● {power.state}</span>
            <span
              className="type-mono"
              style={{ fontSize: 11, color: "var(--text-3)" }}
            >
              uptime {fmtUptime(power.uptime)} · vmid {power.vmid}
            </span>
          </>
        )}
        <Link
          href="/dashboard/health"
          className="type-mono"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--brand)",
            textDecoration: "none",
          }}
        >
          View details →
        </Link>
      </div>

      {err && (
        <div className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>
          {err}
        </div>
      )}

      {!power && !err && (
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--text-3)" }}
        >
          Loading…
        </div>
      )}

      {power && (
        <>
          <StatRow
            label="CPU"
            pct={power.cpu * 100}
            detail={`${power.cpus} cores`}
            values={pickValues(metrics?.series.cpu)}
            color="var(--brand)"
          />
          <StatRow
            label="Memory"
            pct={(power.mem / power.maxmem) * 100}
            detail={`${fmtGb(power.mem)} / ${fmtGb(power.maxmem)}`}
            values={pickValues(metrics?.series.ram)}
            color="var(--accent)"
          />
          <StatRow
            label="Disk"
            pct={(power.disk / power.maxdisk) * 100}
            detail={`${fmtGb(power.disk)} / ${fmtGb(power.maxdisk)}`}
            values={pickValues(metrics?.series.disk)}
            color="var(--info)"
          />
        </>
      )}
    </section>
  );
}
