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
}: {
  series: SeriesMap;
  enabled: Set<string>;
}) {
  const showCpu = enabled.has("cpu") && (series.cpu?.length ?? 0) > 0;
  const showRam = enabled.has("ram") && (series.ram?.length ?? 0) > 0;
  const showDisk = enabled.has("disk") && (series.disk?.length ?? 0) > 0;
  const showNet =
    (enabled.has("net") || enabled.has("net_in") || enabled.has("net_out")) &&
    ((series.net_in?.length ?? 0) > 0 || (series.net_out?.length ?? 0) > 0);

  const panels = [
    showCpu && (
      <CpuArea key="cpu" points={series.cpu ?? []} />
    ),
    showRam && (
      <RamBand key="ram" points={series.ram ?? []} />
    ),
    showDisk && (
      <DiskGauge key="disk" points={series.disk ?? []} />
    ),
    showNet && (
      <NetMirror
        key="net"
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
  sub?: string;
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
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
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
          className="type-mono"
          style={{ fontSize: 10.5, color: "var(--text-4)" }}
        >
          live
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-sans))",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color,
            lineHeight: 1,
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
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
}

function useChartId() {
  return useId().replace(/:/g, "");
}

// ─────────────────────────── CPU: area + live pulse ─────────────────────────── //

function CpuArea({ points }: { points: MetricPoint[] }) {
  const id = useChartId();
  const color = seriesColor("cpu");
  const last = lastValue(points) ?? 0;
  const W = 260;
  const H = 70;

  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const xs = points.map(
      (_, i) => (i / (points.length - 1)) * W,
    );
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
    <PanelShell
      label="CPU"
      value={formatPercent(last)}
      sub="of 100%"
      color={color}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: H }}
      >
        <defs>
          <linearGradient id={`cpu-fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`cpu-line-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* baseline */}
        <line
          x1="0"
          x2={W}
          y1={H - 4}
          y2={H - 4}
          stroke="var(--line)"
          strokeWidth="1"
        />
        {geo && (
          <>
            <path d={geo.area} fill={`url(#cpu-fill-${id})`} />
            <path
              d={geo.path}
              fill="none"
              stroke={`url(#cpu-line-${id})`}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-line"
              style={{ ["--draw-len" as string]: 800 }}
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="6"
              fill={color}
              opacity="0.25"
              className="chart-tip-halo"
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="3"
              fill={color}
              className="chart-tip-core"
            />
          </>
        )}
      </svg>
    </PanelShell>
  );
}

// ─────────────────────────── RAM: stepped band + threshold ─────────────────────────── //

function RamBand({ points }: { points: MetricPoint[] }) {
  const id = useChartId();
  const color = seriesColor("ram");
  const last = lastValue(points) ?? 0;
  const peak = useMemo(
    () => points.reduce((m, p) => Math.max(m, p.value), 0),
    [points],
  );
  const W = 260;
  const H = 70;

  const geo = useMemo(() => {
    if (points.length < 2 || peak === 0) return null;
    const xs = points.map(
      (_, i) => (i / (points.length - 1)) * W,
    );
    const ys = points.map((p) => H - 4 - (p.value / (peak * 1.15)) * (H - 10));
    // Stepped path
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
    const peakY = H - 4 - (peak / (peak * 1.15)) * (H - 10);
    return {
      path,
      area,
      peakY,
      tipX: xs[xs.length - 1],
      tipY: ys[ys.length - 1],
    };
  }, [points, peak]);

  return (
    <PanelShell
      label="MEMORY"
      value={formatBytes(last)}
      sub={`peak ${formatBytes(peak)}`}
      color={color}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: H }}
      >
        <defs>
          <linearGradient id={`ram-fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {geo && (
          <>
            <path d={geo.area} fill={`url(#ram-fill-${id})`} />
            {/* peak dashed line */}
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
              strokeWidth="1.6"
              strokeLinejoin="miter"
              className="chart-line"
              style={{ ["--draw-len" as string]: 1000 }}
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="6"
              fill={color}
              opacity="0.25"
              className="chart-tip-halo"
            />
            <circle
              cx={geo.tipX}
              cy={geo.tipY}
              r="3"
              fill={color}
              className="chart-tip-core"
            />
          </>
        )}
      </svg>
    </PanelShell>
  );
}

// ─────────────────────────── DISK: radial gauge ─────────────────────────── //

function DiskGauge({ points }: { points: MetricPoint[] }) {
  const id = useChartId();
  const color = seriesColor("disk");
  const last = lastValue(points) ?? 0;
  const pct = Math.max(0, Math.min(100, last));
  // Determine tone based on fill
  const tone =
    pct >= 90 ? "var(--crit)" : pct >= 75 ? "var(--warn)" : color;

  const SIZE = 130;
  const STROKE = 12;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  // Open the ring at the bottom (3/4 arc)
  const visibleArc = 0.75;
  const dash = C * visibleArc;
  const filled = (pct / 100) * dash;
  const remaining = dash - filled;

  return (
    <PanelShell
      label="DISK"
      value={formatPercent(pct)}
      sub="utilised"
      color={tone}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: 70,
        }}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          style={{ display: "block", maxHeight: 110 }}
        >
          <defs>
            <linearGradient id={`disk-${id}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor={tone} stopOpacity="0.6" />
              <stop offset="100%" stopColor={tone} stopOpacity="1" />
            </linearGradient>
          </defs>
          <g
            transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke="var(--line)"
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeLinecap="round"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={`url(#disk-${id})`}
              strokeWidth={STROKE}
              strokeDasharray={`${filled} ${remaining + (C - dash)}`}
              strokeLinecap="round"
              className="chart-line"
              style={{
                ["--draw-len" as string]: filled,
                filter: `drop-shadow(0 0 6px color-mix(in oklch, ${tone} 50%, transparent))`,
              }}
            />
          </g>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r="3"
            fill={tone}
            className="chart-tip-core"
          />
        </svg>
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
  const H = 84;
  const MID = H / 2;

  const peak = useMemo(() => {
    let m = 1;
    for (const p of inPoints) if (p.value > m) m = p.value;
    for (const p of outPoints) if (p.value > m) m = p.value;
    return m;
  }, [inPoints, outPoints]);

  function build(points: MetricPoint[], direction: "up" | "down") {
    if (points.length < 2) return null;
    const xs = points.map(
      (_, i) => (i / (points.length - 1)) * W,
    );
    const reach = MID - 6;
    const ys = points.map((p) => {
      const v = (p.value / peak) * reach;
      return direction === "up" ? MID - v : MID + v;
    });
    const path = xs
      .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
      .join(" ");
    const area = `${path} L${W},${MID} L0,${MID} Z`;
    return {
      path,
      area,
      tipX: xs[xs.length - 1],
      tipY: ys[ys.length - 1],
    };
  }

  const upGeo = build(inPoints, "up");
  const downGeo = build(outPoints, "down");

  return (
    <PanelShell
      label="NETWORK"
      value={formatRate(lastIn)}
      sub={`↓ in · ↑ ${formatRate(lastOut)}`}
      color={colorIn}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: H }}
      >
        <defs>
          <linearGradient id={`netin-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorIn} stopOpacity="0.55" />
            <stop offset="100%" stopColor={colorIn} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`netout-${id}`} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor={colorOut} stopOpacity="0.55" />
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
        {upGeo && (
          <>
            <path d={upGeo.area} fill={`url(#netin-${id})`} />
            <path
              d={upGeo.path}
              fill="none"
              stroke={colorIn}
              strokeWidth="1.5"
              strokeLinecap="round"
              className="chart-line"
              style={{ ["--draw-len" as string]: 900 }}
            />
            <circle
              cx={upGeo.tipX}
              cy={upGeo.tipY}
              r="3"
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
              strokeWidth="1.5"
              strokeLinecap="round"
              className="chart-line"
              style={{ ["--draw-len" as string]: 900 }}
            />
            <circle
              cx={downGeo.tipX}
              cy={downGeo.tipY}
              r="3"
              fill={colorOut}
              className="chart-tip-core"
            />
          </>
        )}
      </svg>
    </PanelShell>
  );
}
