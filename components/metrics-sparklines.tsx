"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SparklineCard from "@/components/sparkline-card";
import type { MetricPoint } from "@/lib/provisioner/types";

type ApiResponse = {
  window: string;
  step: string;
  series: Record<string, MetricPoint[]>;
};

export default function MetricsSparklines({
  endpoint,
  detailsHref,
  cards,
  pollMs = 30000,
}: {
  endpoint: string;
  detailsHref?: string;
  cards: { key: string; label?: string }[];
  pollMs?: number;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${endpoint}?window=1h`, { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setData((await res.json()) as ApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
    let id: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (id != null) return;
      id = setInterval(() => {
        if (document.visibilityState === "visible") fetchData();
      }, pollMs);
    }
    function stop() {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    }
    function onVis() {
      if (document.visibilityState === "visible") {
        fetchData();
        start();
      } else {
        stop();
      }
    }
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchData, pollMs]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="type-eyebrow">§ RESOURCES — LAST 1H</span>
        <span className="type-meta">
          {loading ? "Loading…" : `Polled every ${Math.round(pollMs / 1000)}s`}
        </span>
      </div>
      {error && (
        <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <SparklineCard
            key={c.key}
            seriesKey={c.key}
            label={c.label}
            points={data?.series[c.key] ?? []}
            loading={loading}
          />
        ))}
      </div>
      {detailsHref && (
        <div className="flex justify-end">
          <Link
            href={detailsHref}
            className="type-mono text-[12px]"
            style={{ color: "var(--color-navy)" }}
          >
            View details →
          </Link>
        </div>
      )}
    </div>
  );
}
