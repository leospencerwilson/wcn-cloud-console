"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import FullChart from "@/components/full-chart";
import type { MetricPoint, MetricsWindow } from "@/lib/provisioner/types";
import { seriesColor, seriesLabel } from "@/lib/metrics";

type ApiResponse = {
  window: MetricsWindow;
  step: string;
  series: Record<string, MetricPoint[]>;
};

const WINDOWS: MetricsWindow[] = ["1h", "24h", "7d", "30d"];

export default function MetricsDashboard({
  endpoint,
  allSeries,
  defaultSeries,
}: {
  endpoint: string;
  allSeries: string[];
  defaultSeries: string[];
}) {
  const [window, setWindow] = useState<MetricsWindow>("1h");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set(defaultSeries));

  const seriesParam = defaultSeries.join(",");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${endpoint}?window=${window}&series=${encodeURIComponent(seriesParam)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        setData(null);
        return;
      }
      setData((await res.json()) as ApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [endpoint, window, seriesParam]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderable = useMemo(() => {
    if (!data) return [];
    const keys = Object.keys(data.series).filter((k) => enabled.has(k) || enabled.has(stripDirection(k)));
    return keys;
  }, [data, enabled]);

  function toggle(key: string) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div
        className="flex items-center justify-between flex-wrap gap-4 px-6 py-4"
        style={{
          background: "var(--color-ivory)",
          border: "1px solid var(--color-hairline)",
          borderRadius: 2,
        }}
      >
        <div className="flex items-center gap-1" role="tablist">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={window === w}
              className="type-mono text-[12px] px-3 py-1.5"
              onClick={() => setWindow(w)}
              style={{
                background: window === w ? "var(--color-navy)" : "transparent",
                color: window === w ? "var(--color-ivory)" : "var(--color-charcoal)",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {allSeries.map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 type-mono text-[12px] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={enabled.has(s)}
                onChange={() => toggle(s)}
              />
              <span
                aria-hidden
                className="inline-block"
                style={{
                  width: 10,
                  height: 2,
                  background: seriesColor(s === "net" ? "net_in" : s),
                }}
              />
              {seriesLabel(s === "net" ? "Network" : s) || s}
            </label>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={fetchData}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6">
        {renderable.length === 0 && !loading && !error && (
          <Card>
            <p
              className="px-8 py-10 type-mono text-[12px]"
              style={{ color: "var(--color-muted)" }}
            >
              {data ? "No series enabled." : "No data yet."}
            </p>
          </Card>
        )}
        {data &&
          renderable.map((key) => (
            <Card key={key}>
              <div
                className="px-6 py-3 border-b flex items-baseline justify-between"
                style={{ borderColor: "var(--color-hairline)" }}
              >
                <span className="type-eyebrow">§ {seriesLabel(key).toUpperCase()}</span>
                <span
                  className="type-mono text-[11px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  step {data.step} · {data.series[key]?.length ?? 0} pts
                </span>
              </div>
              <div className="px-4 py-4">
                <FullChart
                  seriesKey={key}
                  points={data.series[key] ?? []}
                  window={window}
                />
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}

function stripDirection(k: string): string {
  if (k === "net_in" || k === "net_out") return "net";
  return k;
}
