"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LiveMetricsRow from "@/components/charts/live-metrics-row";
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

  const hasAny = useMemo(() => {
    if (!data) return false;
    return Object.keys(data.series).some(
      (k) => enabled.has(k) || enabled.has(stripDirection(k)),
    );
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
      <div className="toolbar justify-between">
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
                background: window === w ? "var(--brand)" : "transparent",
                color: window === w ? "var(--brand-ink)" : "var(--text-2)",
                border: "1px solid var(--line)",
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

      {data && hasAny ? (
        <LiveMetricsRow series={data.series} enabled={enabled} />
      ) : (
        !loading &&
        !error && (
          <div
            className="surface-card type-mono text-[12px]"
            style={{ padding: "24px 22px", color: "var(--text-3)" }}
          >
            {data ? "No series enabled." : "No data yet."}
          </div>
        )
      )}
    </div>
  );
}

function stripDirection(k: string): string {
  if (k === "net_in" || k === "net_out") return "net";
  return k;
}
