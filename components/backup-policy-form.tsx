"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BackupFrequency,
  BackupPolicy,
} from "@/lib/provisioner/vms-client";

const FREQUENCIES: { value: BackupFrequency; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const RETENTION_TICKS = [1, 7, 30, 90, 365];

function hhmm(time: string): string {
  return time.slice(0, 5);
}

function timeToSlot(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return Math.max(0, Math.min(287, h * 12 + Math.floor(m / 5)));
}

function slotToTime(slot: number): string {
  const v = Math.max(0, Math.min(287, slot));
  const h = Math.floor(v / 12);
  const m = (v % 12) * 5;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function relativePast(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function nextRunLabel(p: BackupPolicy): string {
  if (!p.enabled || p.frequency === "disabled") return "—";
  const now = new Date();
  if (p.frequency === "hourly") {
    const next = new Date(now);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    const diff = next.getTime() - now.getTime();
    return `in ${Math.max(1, Math.floor(diff / 60_000))}m`;
  }
  const [hh, mm] = p.time_utc.split(":").map(Number);
  const next = new Date(now);
  next.setUTCHours(hh, mm, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  if (p.frequency === "weekly") {
    while (next.getUTCDay() !== 0) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
  }
  const hours = Math.floor((next.getTime() - now.getTime()) / 3_600_000);
  if (hours >= 24) return `in ${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours >= 1) return `in ${hours}h`;
  return `in ${Math.max(1, Math.floor((next.getTime() - now.getTime()) / 60_000))}m`;
}

export default function BackupPolicyForm({ slug }: { slug: string }) {
  const [policy, setPolicy] = useState<BackupPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<BackupFrequency>("daily");
  const [timeUtc, setTimeUtc] = useState("03:00");
  const [retention, setRetention] = useState(14);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/backup-policy`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      const p = (await res.json()) as BackupPolicy;
      setPolicy(p);
      setEnabled(p.enabled);
      setFrequency(p.frequency === "disabled" ? "daily" : p.frequency);
      setTimeUtc(hhmm(p.time_utc));
      setRetention(p.retention_days);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/backup-policy`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled,
          frequency: enabled ? frequency : "disabled",
          time_utc: `${timeUtc}:00`,
          retention_days: retention,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      const p = (await res.json()) as BackupPolicy;
      setPolicy(p);
      setOkMsg("Saved.");
      setTimeout(() => setOkMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  const timeSlot = useMemo(() => timeToSlot(timeUtc), [timeUtc]);
  const timeSlotPct = (timeSlot / 287) * 100;
  const retentionPct = ((retention - 1) / 364) * 100;
  const timeFieldDisabled = !enabled || frequency === "hourly";

  return (
    <section
      className="surface-card"
      style={{ padding: 0, overflow: "hidden" }}
    >
      <div
        className="flex items-center justify-between gap-3"
        style={{
          padding: "14px 22px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          className="type-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-4)",
          }}
        >
          § Automated backups
        </span>
        {policy && (
          <span
            className="type-mono"
            style={{ fontSize: 11, color: "var(--text-3)" }}
          >
            last run · {relativePast(policy.last_run_at)}
          </span>
        )}
      </div>

      <form onSubmit={onSave} style={{ padding: "22px 22px 20px" }}>
        {loading && (
          <p
            className="type-mono"
            style={{ fontSize: 12, color: "var(--text-3)" }}
          >
            Loading…
          </p>
        )}

        {/* Schedule toggle row */}
        <div className="ios-row">
          <div>
            <div className="ios-row-title">Automatic backups</div>
            <div className="ios-row-sub">
              Run snapshots on a schedule and ship them to B2.
            </div>
          </div>
          <label className="ios-toggle" aria-label="Enable automatic backups">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span className="ios-toggle-track">
              <span className="ios-toggle-thumb" />
            </span>
          </label>
        </div>

        <div className="ios-divider" />

        {/* Frequency segmented control */}
        <div className={`ios-field ${!enabled ? "is-disabled" : ""}`}>
          <div className="ios-field-label-row">
            <span className="ios-field-label">Frequency</span>
            <span className="ios-field-value">
              {FREQUENCIES.find((f) => f.value === frequency)?.label}
            </span>
          </div>
          <div className="ios-segment" role="tablist" aria-label="Frequency">
            {FREQUENCIES.map((f) => (
              <button
                type="button"
                key={f.value}
                role="tab"
                aria-selected={frequency === f.value}
                className={`ios-segment-item${
                  frequency === f.value ? " is-active" : ""
                }`}
                disabled={!enabled}
                onClick={() => setFrequency(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ios-divider" />

        {/* Run at slider */}
        <div className={`ios-field ${timeFieldDisabled ? "is-disabled" : ""}`}>
          <div className="ios-field-label-row">
            <span className="ios-field-label">
              Run at (UTC)
              {frequency === "weekly" ? " · Sundays" : ""}
            </span>
            <span className="ios-field-value ios-field-value--strong">
              {timeUtc}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={287}
            step={1}
            value={timeSlot}
            onChange={(e) => setTimeUtc(slotToTime(Number(e.target.value)))}
            className="ios-slider"
            style={{ ["--pct" as string]: `${timeSlotPct}%` }}
            disabled={timeFieldDisabled}
            aria-label="Run at"
          />
          <div className="ios-slider-ticks">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:55</span>
          </div>
        </div>

        <div className="ios-divider" />

        {/* Keep for slider */}
        <div className={`ios-field ${!enabled ? "is-disabled" : ""}`}>
          <div className="ios-field-label-row">
            <span className="ios-field-label">Keep for</span>
            <span className="ios-field-value ios-field-value--strong">
              {retention} {retention === 1 ? "day" : "days"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={365}
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
            className="ios-slider"
            style={{ ["--pct" as string]: `${retentionPct}%` }}
            disabled={!enabled}
            aria-label="Retention in days"
          />
          <div className="ios-slider-ticks">
            {RETENTION_TICKS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        {policy && (
          <div
            className="type-mono"
            style={{
              marginTop: 20,
              padding: "10px 14px",
              borderRadius: 10,
              background: "color-mix(in oklch, var(--surface) 92%, transparent)",
              border: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11.5,
              color: "var(--text-3)",
            }}
          >
            <span>next scheduled</span>
            <span style={{ color: "var(--text)" }}>
              {nextRunLabel({
                ...policy,
                enabled,
                frequency: enabled ? frequency : "disabled",
                time_utc: `${timeUtc}:00`,
                retention_days: retention,
              })}
            </span>
          </div>
        )}

        {error && (
          <p
            className="type-mono"
            style={{
              fontSize: 12,
              color: "var(--crit)",
              marginTop: 14,
            }}
          >
            {error}
          </p>
        )}
        {okMsg && (
          <p
            className="type-mono"
            style={{
              fontSize: 12,
              color: "var(--ok)",
              marginTop: 14,
            }}
          >
            {okMsg}
          </p>
        )}

        <div className="flex justify-end" style={{ marginTop: 20 }}>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
