"use client";

import { useId, useMemo } from "react";
import type { MetricPoint } from "@/lib/provisioner/types";
import {
  formatBytes,
  formatPercent,
  formatRate,
  lastValue,
  seriesColor,
} from "@/lib/metrics";

type SeriesMap = Record<string, MetricPoint[]>;

export default function LiveMetricsRow({
  series,
  enabled,
  tick = 0,
}: {
  series: SeriesMap;
  enabled: Set<string>;
  tick?: number;
}) {
  const showCpu = enabled.has("cpu") && (series.cpu?.length ?? 0) > 0;
  const showRam = enabled.has("ram") && (series.ram?.length ?? 0) > 0;
  const showDisk = enabled.has("disk") && (series.disk?.length ?? 0) > 0;
  const showNet =
    (enabled.has("net") || enabled.has("net_in") || enabled.has("net_out")) &&
    ((series.net_in?.length ?? 0) > 0 || (series.net_out?.length ?? 0) > 0);

  const panels = [
    showCpu && <CpuArea key={`cpu-${tick}`} points={series.cpu ?? []} />,
    showRam && <RamBand key={`ram-${tick}`} points={series.ram ?? []} />,
    showDisk && <DiskBar key={`disk-${tick}`} points={series.disk ?? []} />,
    showNet && (
      <NetMirror
        key={`net-${tick}`}
        inPoints={series.net_in ?? []}
        outPoints={series.net_out ?? []}
      />
    ),
  ].filter(Boolean);

  if (panels.length === 0) {
    return (
      <div
        className="surface-card type-mono text-[12px]"
        style={{ padding: "24px 22px", color: "var(--text-3)" }}
      >
        No series enabled.
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${panels.length}, minmax(0, 1fr))`,
      }}
    >
      {panels}
    </div>
  );
}

// ─────────────────────────── Shared chrome ─────────────────────────── //

function PanelShell({
  label,
  value,
  sub,
  color,
  children,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="surface-card"
      style={{
        padding: "14px 16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-baseline justify-between gap-2"
        style={{ position: "relative", zIndex: 1 }}
      >
        <span
          className="type-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-4)",
          }}
        >
          {label}
        </span>
        <span
          className="flex items-center gap-1.5 type-mono"
          style={{ fontSize: 10.5, color: "var(--text-3)" }}
        >
          <span
            className="heartbeat-dot"
            style={{
              ["--hb" as string]: color,
              width: 6,
              height: 6,
            }}
            aria-hidden
          />
          live
        </span>
      </div>
      <div
        className="flex items-baseline gap-2"
        style={{ position: "relative", zIndex: 1 }}
      >
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-sans))",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color,
            lineHeight: 1,
            textShadow: `0 0 18px color-mix(in oklch, ${color} 35%, transparent)`,
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="type-mono"
            style={{ fontSize: 10.5, color: "var(--text-3)" }}
          >
            {sub}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </section>
  );
}

function useChartId() {
  return useId().replace(/:/g, "");
}

// Detect whether a ram series is actually a percentage (0..100).
function ramIsPercent(points: MetricPoint[]): boolean {
  if (points.length === 0) return false;
  for (const p of points) {
    if (p.value < 0 || p.value > 100) return false;
  }
  return true;
}

// ─────────────────────────── CPU: area + live pulse ─────────────────────────── //

function CpuArea({ points }: { points: MetricPoint[] }) {
  const id = useChartId();
  const color = seriesColor("cpu");
  const last = lastValue(points) ?? 0;
  const W = 260;
  const H = 76;

  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map((_, i) => (i / (points.length - 1)) * W);
    const ys = points.map((p) => H - 4 - (p.value / 100) * (H - 8));
    const path = xs
      .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
      .join(" ");
    const area = `${path} L${W},${H} L0,${H} Z`;
    return {
      path,
      area,
      tipX: xs[xs.length - 1],
      tipY: ys[ys.length - 1],
    };
  }, [points]);

  return (
    <PanelShell label="CPU" value={formatPercent(last)} sub="of 100%" color={color}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: H }}
      >
        <defs>
          <linearGradient id={`cpu-fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`cpu-line-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          x2={W}
          y1={H - 4}
          y2={H - 4}
          stroke="var(--line)"
          strokeWidth="1"
        />
        {geo && (
          <g className="chart-breathe">
            <path d={geo.area} fill={`url(#cpu-fill-${id})`} />
            <path
              d={geo.path}
              fill="none"
              stroke={`url(#cpu-line-${id})`}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-line"
              style={{
                ["--draw-len" as string]: 800,
                filter: `drop-shadow(0 0 4px color-mix(in oklch, ${color} 60%, transparent))`,
              }}
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="7"
              fill={color}
              opacity="0.3"
              className="chart-tip-halo"
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="3.5"
              fill={color}
              className="chart-tip-core"
            />
          </g>
        )}
      </svg>
    </PanelShell>
  );
}

// ─────────────────────────── RAM: stepped band ─────────────────────────── //

function RamBand({ points }: { points: MetricPoint[] }) {
  const id = useChartId();
  const color = seriesColor("ram");
  const isPct = ramIsPercent(points);
  const last = lastValue(points) ?? 0;
  const peak = useMemo(
    () => points.reduce((m, p) => Math.max(m, p.value), 0),
    [points],
  );
  const W = 260;
  const H = 76;

  const yMax = isPct ? 100 : peak * 1.15 || 1;

  const geo = useMemo(() => {
    if (points.length < 2 || yMax === 0) return null;
    const xs = points.map((_, i) => (i / (points.length - 1)) * W);
    const ys = points.map((p) => H - 4 - (p.value / yMax) * (H - 10));
    const cmds: string[] = [];
    for (let i = 0; i < xs.length; i++) {
      if (i === 0) cmds.push(`M${xs[i].toFixed(1)},${ys[i].toFixed(1)}`);
      else {
        cmds.push(`H${xs[i].toFixed(1)}`);
        cmds.push(`V${ys[i].toFixed(1)}`);
      }
    }
    const path = cmds.join(" ");
    const area = `${path} V${H} L0,${H} Z`;
    const peakY = H - 4 - (peak / yMax) * (H - 10);
    return {
      path,
      area,
      peakY,
      tipX: xs[xs.length - 1],
      tipY: ys[ys.length - 1],
    };
  }, [points, yMax, peak]);

  const fmt = isPct ? formatPercent : formatBytes;

  return (
    <PanelShell
      label="MEMORY"
      value={fmt(last)}
      sub={`peak ${fmt(peak)}`}
      color={color}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: H }}
      >
        <defs>
          <linearGradient id={`ram-fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.65" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {geo && (
          <g className="chart-breathe">
            <path d={geo.area} fill={`url(#ram-fill-${id})`} />
            <line
              x1="0"
              x2={W}
              y1={geo.peakY}
              y2={geo.peakY}
              stroke={color}
              strokeOpacity="0.5"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <path
              d={geo.path}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinejoin="miter"
              className="chart-line"
              style={{
                ["--draw-len" as string]: 1000,
                filter: `drop-shadow(0 0 4px color-mix(in oklch, ${color} 55%, transparent))`,
              }}
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="7"
              fill={color}
              opacity="0.3"
              className="chart-tip-halo"
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="3.5"
              fill={color}
              className="chart-tip-core"
            />
          </g>
        )}
      </svg>
    </PanelShell>
  );
}

// ─────────────────────────── DISK: utilization bar ─────────────────────────── //

function DiskBar({ points }: { points: MetricPoint[] }) {
  const id = useChartId();
  const base = seriesColor("disk");
  const last = lastValue(points) ?? 0;
  const pct = Math.max(0, Math.min(100, last));
  const tone =
    pct >= 90 ? "var(--crit)" : pct >= 75 ? "var(--warn)" : base;

  return (
    <PanelShell
      label="DISK"
      value={formatPercent(pct)}
      sub="utilised"
      color={tone}
    >
      <div
        style={{
          height: 76,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            position: "relative",
            height: 14,
            borderRadius: 999,
            background: "color-mix(in oklch, var(--text-4) 18%, transparent)",
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          <div
            key={`disk-fill-${id}-${pct.toFixed(1)}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: `${pct}%`,
              borderRadius: 999,
              background: `linear-gradient(to right, color-mix(in oklch, ${tone} 55%, transparent), ${tone})`,
              boxShadow: `0 0 12px color-mix(in oklch, ${tone} 55%, transparent)`,
              transition: "width 600ms cubic-bezier(.2,.7,.2,1)",
            }}
          />
          {[25, 50, 75, 90].map((t) => (
            <span
              key={t}
              aria-hidden
              style={{
                position: "absolute",
                top: 3,
                bottom: 3,
                left: `${t}%`,
                width: 1,
                background:
                  t === 90
                    ? "color-mix(in oklch, var(--crit) 50%, transparent)"
                    : t === 75
                    ? "color-mix(in oklch, var(--warn) 50%, transparent)"
                    : "color-mix(in oklch, var(--text-4) 50%, transparent)",
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-4)",
            letterSpacing: "0.04em",
          }}
        >
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span style={{ color: "color-mix(in oklch, var(--warn) 80%, var(--text-4))" }}>75</span>
          <span style={{ color: "color-mix(in oklch, var(--crit) 80%, var(--text-4))" }}>90</span>
          <span>100</span>
        </div>
      </div>
    </PanelShell>
  );
}

// ─────────────────────────── NET: mirrored in/out ─────────────────────────── //

function NetMirror({
  inPoints,
  outPoints,
}: {
  inPoints: MetricPoint[];
  outPoints: MetricPoint[];
}) {
  const id = useChartId();
  const colorIn = seriesColor("net_in");
  const colorOut = seriesColor("net_out");
  const lastIn = lastValue(inPoints) ?? 0;
  const lastOut = lastValue(outPoints) ?? 0;
  const W = 260;
  const H = 92;
  const MID = H / 2;

  const peak = useMemo(() => {
    let m = 1;
    for (const p of inPoints) if (p.value > m) m = p.value;
    for (const p of outPoints) if (p.value > m) m = p.value;
    return m;
  }, [inPoints, outPoints]);

  function build(points: MetricPoint[], direction: "up" | "down") {
    if (points.length < 2) return null;
    const xs = points.map((_, i) => (i / (points.length - 1)) * W);
    const reach = MID - 6;
    const ys = points.map((p) => {
      const v = (p.value / peak) * reach;
      return direction === "up" ? MID - v : MID + v;
    });
    const path = xs
      .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
      .join(" ");
    const area = `${path} L${W},${MID} L0,${MID} Z`;
    return { path, area, tipX: xs[xs.length - 1], tipY: ys[ys.length - 1] };
  }

  const upGeo = build(inPoints, "up");
  const downGeo = build(outPoints, "down");

  return (
    <PanelShell
      label="NETWORK"
      value={formatRate(lastIn)}
      sub={
        <>
          <span style={{ color: colorIn }}>↓ in</span>
          <span style={{ margin: "0 6px", color: "var(--text-4)" }}>·</span>
          <span style={{ color: colorOut }}>↑ {formatRate(lastOut)}</span>
        </>
      }
      color={colorIn}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: H }}
      >
        <defs>
          <linearGradient id={`netin-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorIn} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colorIn} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`netout-${id}`} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor={colorOut} stopOpacity="0.7" />
            <stop offset="100%" stopColor={colorOut} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          x2={W}
          y1={MID}
          y2={MID}
          stroke="var(--line)"
          strokeWidth="1"
        />
        <g className="chart-breathe-mirror">
        {upGeo && (
          <>
            <path d={upGeo.area} fill={`url(#netin-${id})`} />
            <path
              d={upGeo.path}
              fill="none"
              stroke={colorIn}
              strokeWidth="1.7"
              strokeLinecap="round"
              className="chart-line"
              style={{
                ["--draw-len" as string]: 900,
                filter: `drop-shadow(0 0 4px color-mix(in oklch, ${colorIn} 55%, transparent))`,
              }}
            />
            <circle
              cx={upGeo.tipX}
              cy={upGeo.tipY}
              r="3.5"
              fill={colorIn}
              className="chart-tip-core"
            />
          </>
        )}
        {downGeo && (
          <>
            <path d={downGeo.area} fill={`url(#netout-${id})`} />
            <path
              d={downGeo.path}
              fill="none"
              stroke={colorOut}
              strokeWidth="1.7"
              strokeLinecap="round"
              className="chart-line"
              style={{
                ["--draw-len" as string]: 900,
                filter: `drop-shadow(0 0 4px color-mix(in oklch, ${colorOut} 55%, transparent))`,
              }}
            />
            <circle
              cx={downGeo.tipX}
              cy={downGeo.tipY}
              r="3.5"
              fill={colorOut}
              className="chart-tip-core"
            />
          </>
        )}
        </g>
      </svg>
    </PanelShell>
  );
}
