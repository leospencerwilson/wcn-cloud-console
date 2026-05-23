"use client";

import { useCallback, useEffect, useState } from "react";
import LiveMetricsRow from "@/components/charts/live-metrics-row";
import type { MetricPoint, MetricsWindow } from "@/lib/provisioner/types";

type ApiResponse = {
  window: MetricsWindow;
  step: string;
  series: Record<string, MetricPoint[]>;
};

const REFRESH_MS = 10_000;

export default function MetricsDashboard({
  endpoint,
  defaultSeries,
}: {
  endpoint: string;
  // Kept for API compatibility with callers. allSeries is no longer used —
  // the live view always shows every available panel.
  allSeries?: string[];
  defaultSeries: string[];
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const seriesParam = defaultSeries.join(",");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${endpoint}?window=1h&series=${encodeURIComponent(seriesParam)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setData((await res.json()) as ApiResponse);
      setError(null);
      setTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }, [endpoint, seriesParam]);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchData();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  const enabled = new Set(["cpu", "ram", "disk", "net"]);

  return (
    <div className="space-y-4">
      {error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--crit)" }}
        >
          {error}
        </p>
      )}
      {data ? (
        <LiveMetricsRow series={data.series} enabled={enabled} tick={tick} />
      ) : (
        !error && (
          <div
            className="surface-card type-mono text-[12px]"
            style={{ padding: "24px 22px", color: "var(--text-3)" }}
          >
            No data yet.
          </div>
        )
      )}
    </div>
  );
}
