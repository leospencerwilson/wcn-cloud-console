import type { MetricsWindow } from "./types";

export const WINDOWS: readonly MetricsWindow[] = ["1h", "24h", "7d", "30d"];

export const VM_SERIES = new Set(["cpu", "ram", "disk", "net"]);
export const APP_SERIES = new Set(["cpu", "ram", "ram_pct", "net"]);

export function parseWindow(raw: string | null): MetricsWindow | null {
  const v = (raw ?? "1h") as MetricsWindow;
  return WINDOWS.includes(v) ? v : null;
}

export function parseSeries(raw: string | null, allowed: Set<string>): string | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  for (const p of parts) if (!allowed.has(p)) return null;
  return parts.join(",");
}
