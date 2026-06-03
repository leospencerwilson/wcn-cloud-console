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
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="type-mono"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-3)",
          }}
        >
          {heading}
        </span>
        {change !== null && Math.abs(change) >= 0.5 ? (
          <span
            className="type-mono text-[11px]"
            style={{
              color: change > 0 ? "var(--crit)" : "var(--ok)",
            }}
          >
            {change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </span>
        ) : (
          <span className="type-mono text-[11px]" style={{ color: "var(--text-4)" }}>
            =
          </span>
        )}
      </div>
      <div
        className="type-mono tabular-nums"
        style={{
          fontSize: 22,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        {loading && last === null
          ? "—"
          : last === null
            ? "no data"
            : formatValue(seriesKey, last)}
      </div>
      <div style={{ marginTop: "auto" }}>
        <Sparkline points={points} seriesKey={seriesKey} color={color} width={220} height={42} />
      </div>
    </section>
  );
}
