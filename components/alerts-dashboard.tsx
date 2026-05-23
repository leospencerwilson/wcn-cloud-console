"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type {
  AlertFiring,
  AlertRule,
  AlertSeverity,
} from "@/lib/provisioner/types";

function severityColor(s: AlertSeverity): string {
  if (s === "critical") return "var(--color-danger, #b03020)";
  if (s === "warning") return "var(--color-warning, #b07a1f)";
  return "var(--color-navy)";
}

function severityGlyph(s: AlertSeverity): string {
  if (s === "critical") return "●";
  if (s === "warning") return "▲";
  return "ⓘ";
}

function ruleStateColor(state: AlertRule["state"]): string {
  if (state === "firing") return "var(--color-danger, #b03020)";
  if (state === "pending") return "var(--color-warning, #b07a1f)";
  return "var(--color-success, #2f6b3a)";
}

function durationLabel(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.round(s / 3600)}h`;
}

function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(0, Math.floor(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

export default function AlertsDashboard({
  slug,
  showCustomer = true,
  showRules = true,
}: {
  slug?: string;
  showCustomer?: boolean;
  showRules?: boolean;
}) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [active, setActive] = useState<AlertFiring[]>([]);
  const [recent, setRecent] = useState<AlertFiring[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const slugQs = slug ? `&slug=${encodeURIComponent(slug)}` : "";

  const fetchFirings = useCallback(async () => {
    try {
      const [activeRes, recentRes] = await Promise.all([
        fetch(`/api/admin/alerts/firings?status=firing${slugQs}`, { cache: "no-store" }),
        fetch(
          `/api/admin/alerts/firings?since=${encodeURIComponent(sevenDaysAgo())}&limit=100${slugQs}`,
          { cache: "no-store" },
        ),
      ]);
      if (!activeRes.ok) {
        const d = (await activeRes.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${activeRes.status}`);
        return;
      }
      if (!recentRes.ok) {
        const d = (await recentRes.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${recentRes.status}`);
        return;
      }
      setActive((await activeRes.json()) as AlertFiring[]);
      setRecent((await recentRes.json()) as AlertFiring[]);
      setError(null);
      setLastUpdate(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }, [slugQs]);

  const fetchRules = useCallback(async () => {
    if (!showRules) return;
    try {
      const res = await fetch("/api/admin/alerts/rules", { cache: "no-store" });
      if (!res.ok) return;
      setRules((await res.json()) as AlertRule[]);
    } catch {
      // tolerate; rules update is non-critical
    }
  }, [showRules]);

  useEffect(() => {
    fetchFirings();
    fetchRules();
    const a = setInterval(() => {
      if (document.visibilityState === "visible") fetchFirings();
    }, 60_000);
    const b = setInterval(() => {
      if (document.visibilityState === "visible") fetchRules();
    }, 5 * 60_000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [fetchFirings, fetchRules]);

  const firingCount = active.length;

  return (
    <div className="space-y-8">
      <div
        className="flex items-center justify-between flex-wrap gap-4 px-6 py-4"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-2)",
          color: "var(--text-2)",
        }}
      >
        <div className="flex items-center gap-6 flex-wrap">
          <span className="flex items-center gap-2 type-mono text-[13px]">
            <span
              aria-hidden
              style={{
                color:
                  firingCount > 0
                    ? "var(--color-danger, #b03020)"
                    : "var(--color-success, #2f6b3a)",
              }}
            >
              ●
            </span>
            {firingCount} firing
          </span>
          {showRules && (
            <span className="type-mono text-[13px]" style={{ color: "var(--color-muted)" }}>
              ▲ {rules.length} rules configured
            </span>
          )}
        </div>
        <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
          {lastUpdate
            ? `last update ${new Date(lastUpdate).toLocaleTimeString()}`
            : "polling…"}
        </span>
      </div>

      {error && (
        <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
          {error}
        </p>
      )}

      <section>
        <h3 className="type-eyebrow mb-4">— ACTIVE</h3>
        <Card>
          {active.length === 0 ? (
            <div className="px-8 py-10 flex items-center gap-3">
              <span aria-hidden style={{ color: "var(--color-success, #2f6b3a)" }}>
                ●
              </span>
              <span className="type-mono text-[13px]" style={{ color: "var(--color-muted)" }}>
                All systems quiet.
              </span>
            </div>
          ) : (
            <ul>
              {active.map((a, i) => (
                <li
                  key={a.id}
                  className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span aria-hidden style={{ color: severityColor(a.severity) }}>
                      {severityGlyph(a.severity)}
                    </span>
                    <div>
                      <div className="text-[14px] font-medium">{a.alertname}</div>
                      <div className="type-meta mt-1">{a.summary}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {showCustomer && a.slug && (
                      <Link
                        href={`/admin/customers/${a.slug}`}
                        className="type-mono text-[12px]"
                        style={{ color: "var(--color-navy)" }}
                      >
                        {a.slug}
                      </Link>
                    )}
                    <span
                      className="type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {ageLabel(a.started_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {showRules && (
        <section>
          <h3 className="type-eyebrow mb-4">— RULES</h3>
          <Card>
            {rules.length === 0 ? (
              <p
                className="px-8 py-6 type-mono text-[12px]"
                style={{ color: "var(--color-muted)" }}
              >
                Rules misconfigured — none reported.
              </p>
            ) : (
              <ul>
                {rules.map((r, i) => (
                  <li
                    key={r.name}
                    className="px-6 py-4 grid grid-cols-12 gap-4 items-center"
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="col-span-1"
                      style={{ color: severityColor(r.severity) }}
                    >
                      {severityGlyph(r.severity)}
                    </span>
                    <div className="col-span-4">
                      <div className="text-[14px] font-medium">{r.name}</div>
                      <div className="type-meta mt-1">{r.summary}</div>
                    </div>
                    <span
                      className="col-span-2 type-mono text-[11px]"
                      style={{ color: severityColor(r.severity) }}
                    >
                      {r.severity}
                    </span>
                    <span
                      className="col-span-2 type-mono text-[11px]"
                      style={{ color: ruleStateColor(r.state) }}
                    >
                      {r.state}
                      {r.firing_count > 0 ? ` (${r.firing_count})` : ""}
                    </span>
                    <span
                      className="col-span-3 type-mono text-[11px] text-right"
                      style={{ color: "var(--color-muted)" }}
                    >
                      after {durationLabel(r.duration_s)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      )}

      <section>
        <h3 className="type-eyebrow mb-4">— RECENT (LAST 7 DAYS)</h3>
        <Card>
          {recent.length === 0 ? (
            <p
              className="px-8 py-6 type-mono text-[12px]"
              style={{ color: "var(--color-muted)" }}
            >
              No alerts in the last 7 days.
            </p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ color: "var(--color-muted)" }}>
                  <th className="text-left px-6 py-2 type-eyebrow">When</th>
                  {showCustomer && (
                    <th className="text-left px-6 py-2 type-eyebrow">Customer</th>
                  )}
                  <th className="text-left px-6 py-2 type-eyebrow">Alert</th>
                  <th className="text-left px-6 py-2 type-eyebrow">Status</th>
                  <th className="text-right px-6 py-2 type-eyebrow">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const end = r.resolved_at
                    ? new Date(r.resolved_at).getTime()
                    : Date.now();
                  const dur = Math.max(0, Math.floor((end - new Date(r.started_at).getTime()) / 1000));
                  return (
                    <tr
                      key={r.id}
                      className="border-t"
                      style={{ borderColor: "var(--color-hairline)" }}
                    >
                      <td className="px-6 py-3 type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                        {new Date(r.started_at).toLocaleString()}
                      </td>
                      {showCustomer && (
                        <td className="px-6 py-3 type-mono text-[12px]">
                          {r.slug ? (
                            <Link
                              href={`/admin/customers/${r.slug}`}
                              style={{ color: "var(--color-navy)" }}
                            >
                              {r.slug}
                            </Link>
                          ) : (
                            <span style={{ color: "var(--color-muted)" }}>cluster</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-3">
                        <span aria-hidden style={{ color: severityColor(r.severity) }}>
                          {severityGlyph(r.severity)}
                        </span>{" "}
                        <span className="type-mono text-[12px]">{r.alertname}</span>
                      </td>
                      <td
                        className="px-6 py-3 type-mono text-[11px]"
                        style={{
                          color:
                            r.status === "firing"
                              ? "var(--color-danger, #b03020)"
                              : "var(--color-muted)",
                        }}
                      >
                        {r.status}
                      </td>
                      <td
                        className="px-6 py-3 type-mono text-[11px] text-right"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {durationLabel(dur)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
