import type { MetricPoint } from "./provisioner/types";

export type SeriesKind = "percent" | "bytes" | "bytes_per_sec";

export function seriesKind(key: string): SeriesKind {
  if (key === "cpu" || key === "disk" || key === "ram_pct") return "percent";
  if (key === "ram") return "bytes";
  if (key === "net_in" || key === "net_out") return "bytes_per_sec";
  return "bytes";
}

export function seriesLabel(key: string): string {
  switch (key) {
    case "cpu":
      return "CPU";
    case "ram":
      return "Memory";
    case "ram_pct":
      return "Memory %";
    case "disk":
      return "Disk";
    case "net_in":
      return "Network in";
    case "net_out":
      return "Network out";
    default:
      return key;
  }
}

export function seriesColor(key: string): string {
  switch (key) {
    case "cpu":
      return "#1f3a5f";
    case "ram":
    case "ram_pct":
      return "#7a4a2d";
    case "disk":
      return "#3a5a3a";
    case "net_in":
      return "#5a3a78";
    case "net_out":
      return "#a8662d";
    default:
      return "#444";
  }
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(b: number): string {
  if (!isFinite(b) || b === 0) return "0 B";
  const sign = b < 0 ? "-" : "";
  const v = Math.abs(b);
  const i = Math.min(
    Math.floor(Math.log(v) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const n = v / Math.pow(1024, i);
  return `${sign}${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${BYTE_UNITS[i]}`;
}

export function formatRate(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

export function formatPercent(p: number): string {
  return `${p.toFixed(p >= 10 ? 0 : 1)}%`;
}

export function formatValue(key: string, v: number): string {
  const kind = seriesKind(key);
  if (kind === "percent") return formatPercent(v);
  if (kind === "bytes_per_sec") return formatRate(v);
  return formatBytes(v);
}

export function lastValue(points: MetricPoint[]): number | null {
  if (!points || points.length === 0) return null;
  return points[points.length - 1].value;
}

export function firstValue(points: MetricPoint[]): number | null {
  if (!points || points.length === 0) return null;
  return points[0].value;
}

export function pctChange(first: number | null, last: number | null): number | null {
  if (first == null || last == null) return null;
  if (first === 0) return last === 0 ? 0 : null;
  return ((last - first) / Math.abs(first)) * 100;
}

export function yDomain(
  points: MetricPoint[],
  kind: SeriesKind,
): [number, number] {
  if (kind === "percent") return [0, 100];
  if (points.length === 0) return [0, 1];
  let max = 0;
  for (const p of points) if (p.value > max) max = p.value;
  if (max === 0) return [0, 1];
  return [0, max * 1.15];
}

export function formatTs(ts: number, window: string): string {
  const d = new Date(ts * 1000);
  if (window === "1h" || window === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
