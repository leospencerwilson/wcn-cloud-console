"use client";

import type { MetricPoint } from "@/lib/provisioner/types";
import {
  firstValue,
  formatValue,
  lastValue,
  pctChange,
  seriesColor,
  seriesLabel,
} from "@/lib/metrics";
import Sparkline from "./sparkline";

export default function SparklineCard({
  seriesKey,
  points,
  label,
  loading,
}: {
  seriesKey: string;
  points: MetricPoint[];
  label?: string;
  loading?: boolean;
}) {
  const last = lastValue(points);
  const first = firstValue(points);
  const change = pctChange(first, last);
  const color = seriesColor(seriesKey);
  const heading = label ?? seriesLabel(seriesKey);

  return (
    <div
      className="px-5 py-4 flex flex-col gap-2"
      style={{
        background: "var(--color-ivory)",
        border: "1px solid var(--color-hairline)",
        borderRadius: 2,
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="type-eyebrow">— {heading}</span>
        {change !== null && Math.abs(change) >= 0.5 ? (
          <span
            className="type-mono text-[11px]"
            style={{
              color:
                change > 0
                  ? "var(--color-danger, #b03020)"
                  : "var(--color-success, #3a5a3a)",
            }}
          >
            {change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </span>
        ) : (
          <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
            =
          </span>
        )}
      </div>
      <div
        className="type-mono text-[20px] tabular-nums"
        style={{ color: "var(--color-charcoal)" }}
      >
        {loading && last === null
          ? "—"
          : last === null
            ? "no data"
            : formatValue(seriesKey, last)}
      </div>
      <div>
        <Sparkline points={points} seriesKey={seriesKey} color={color} width={200} height={36} />
      </div>
    </div>
  );
}
