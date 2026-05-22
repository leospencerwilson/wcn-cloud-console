"use client";

import { useMemo, useState } from "react";
import type { MetricPoint } from "@/lib/provisioner/types";
import {
  formatTs,
  formatValue,
  seriesColor,
  seriesKind,
  seriesLabel,
  yDomain,
} from "@/lib/metrics";

const PADDING = { top: 12, right: 16, bottom: 28, left: 56 };
const WIDTH = 720;
const HEIGHT = 240;

export default function FullChart({
  seriesKey,
  points,
  window,
}: {
  seriesKey: string;
  points: MetricPoint[];
  window: string;
}) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);

  const geometry = useMemo(() => {
    const innerW = WIDTH - PADDING.left - PADDING.right;
    const innerH = HEIGHT - PADDING.top - PADDING.bottom;
    if (!points || points.length === 0) {
      return { innerW, innerH, xs: [], ys: [], yMin: 0, yMax: 1, path: "", area: "" };
    }
    const kind = seriesKind(seriesKey);
    const [yMin, yMax] = yDomain(points, kind);
    const xs = points.map(
      (_, i) =>
        PADDING.left + (i / Math.max(1, points.length - 1)) * innerW,
    );
    const ys = points.map(
      (p) =>
        PADDING.top +
        innerH -
        ((p.value - yMin) / Math.max(1e-9, yMax - yMin)) * innerH,
    );
    const path = xs
      .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
      .join(" ");
    const area = `${path} L${xs[xs.length - 1]},${PADDING.top + innerH} L${xs[0]},${PADDING.top + innerH} Z`;
    return { innerW, innerH, xs, ys, yMin, yMax, path, area };
  }, [points, seriesKey]);

  const color = seriesColor(seriesKey);

  if (!points || points.length === 0) {
    return (
      <div
        className="px-6 py-12 text-center"
        style={{ color: "var(--color-muted)" }}
      >
        <p className="type-mono text-[12px]">No data yet for {seriesLabel(seriesKey)}.</p>
        <p className="type-meta mt-2">
          Metrics appear ~30 seconds after VM provisioning.
        </p>
      </div>
    );
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    if (px < PADDING.left || px > WIDTH - PADDING.right) {
      setHover(null);
      return;
    }
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < geometry.xs.length; i++) {
      const d = Math.abs(geometry.xs[i] - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setHover({ i: nearest, x: geometry.xs[nearest], y: geometry.ys[nearest] });
  }

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = geometry.yMin + ((geometry.yMax - geometry.yMin) * i) / ticks;
    const y =
      PADDING.top + geometry.innerH - (i / ticks) * geometry.innerH;
    return { v, y };
  });

  const xTickIdxs = (() => {
    const want = 5;
    if (points.length <= want) return points.map((_, i) => i);
    const out: number[] = [];
    for (let i = 0; i < want; i++) {
      out.push(Math.round((i / (want - 1)) * (points.length - 1)));
    }
    return out;
  })();

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={t.y}
              y2={t.y}
              stroke="var(--color-hairline)"
              strokeDasharray={i === 0 ? "0" : "2 3"}
            />
            <text
              x={PADDING.left - 8}
              y={t.y + 3}
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
              fontSize={10}
              fill="var(--color-muted)"
            >
              {formatValue(seriesKey, t.v)}
            </text>
          </g>
        ))}
        {xTickIdxs.map((i) => (
          <text
            key={i}
            x={geometry.xs[i]}
            y={HEIGHT - PADDING.bottom + 16}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={10}
            fill="var(--color-muted)"
          >
            {formatTs(points[i].ts, window)}
          </text>
        ))}
        <path d={geometry.area} fill={color} opacity={0.08} />
        <path d={geometry.path} fill="none" stroke={color} strokeWidth={1.5} />
        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke={color}
              strokeWidth={0.75}
              strokeDasharray="2 3"
            />
            <circle cx={hover.x} cy={hover.y} r={3} fill={color} />
          </g>
        )}
      </svg>
      {hover && (
        <div
          className="absolute pointer-events-none px-3 py-2 type-mono text-[11px]"
          style={{
            left: `${(hover.x / WIDTH) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
            background: "var(--color-ivory)",
            border: "1px solid var(--color-hairline)",
            borderRadius: 2,
            whiteSpace: "nowrap",
            color: "var(--color-charcoal)",
          }}
        >
          <div>{formatTs(points[hover.i].ts, window)}</div>
          <div style={{ color }}>{formatValue(seriesKey, points[hover.i].value)}</div>
        </div>
      )}
    </div>
  );
}
