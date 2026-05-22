"use client";

import type { MetricPoint } from "@/lib/provisioner/types";
import { seriesKind, yDomain } from "@/lib/metrics";

export default function Sparkline({
  points,
  seriesKey,
  width = 120,
  height = 32,
  color,
}: {
  points: MetricPoint[];
  seriesKey: string;
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!points || points.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <line
          x1={0}
          x2={width}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--color-hairline)"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }
  const kind = seriesKind(seriesKey);
  const [yMin, yMax] = yDomain(points, kind);
  const xs = points.map((_, i) => (i / (points.length - 1)) * width);
  const ys = points.map(
    (p) => height - ((p.value - yMin) / Math.max(1e-9, yMax - yMin)) * height,
  );
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  const c = color ?? "var(--color-navy)";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <path d={area} fill={c} opacity={0.08} />
      <path d={d} fill="none" stroke={c} strokeWidth={1.25} />
    </svg>
  );
}
