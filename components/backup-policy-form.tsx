"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type {
  BackupFrequency,
  BackupPolicy,
} from "@/lib/provisioner/vms-client";

const FREQUENCIES: { value: BackupFrequency; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

function hhmm(time: string): string {
  return time.slice(0, 5);
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

  return (
    <Card>
      <div
        className="px-6 py-3 border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">§ AUTOMATED BACKUPS</span>
      </div>
      <form onSubmit={onSave} className="px-6 py-5 space-y-6">
        {loading && (
          <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
            Loading…
          </p>
        )}

        <fieldset className="flex items-center gap-6">
          <legend className="type-eyebrow text-[10px] mb-2">Schedule</legend>
          <label className="flex items-center gap-2 type-mono text-[13px]">
            <input
              type="radio"
              checked={enabled}
              onChange={() => setEnabled(true)}
            />
            Enabled
          </label>
          <label className="flex items-center gap-2 type-mono text-[13px]">
            <input
              type="radio"
              checked={!enabled}
              onChange={() => setEnabled(false)}
            />
            Disabled
          </label>
        </fieldset>

        <fieldset
          className={`flex items-center gap-6 ${!enabled ? "opacity-60" : ""}`}
        >
          <legend className="type-eyebrow text-[10px] mb-2">Frequency</legend>
          {FREQUENCIES.map((f) => (
            <label
              key={f.value}
              className="flex items-center gap-2 type-mono text-[13px]"
            >
              <input
                type="radio"
                name="frequency"
                checked={frequency === f.value}
                onChange={() => setFrequency(f.value)}
                disabled={!enabled}
              />
              {f.label}
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">
              Run at (UTC) {frequency === "weekly" ? "· Sundays" : ""}
            </span>
            <input
              type="time"
              value={timeUtc}
              onChange={(e) => setTimeUtc(e.target.value)}
              disabled={!enabled || frequency === "hourly"}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Keep for (days)</span>
            <input
              type="number"
              min={1}
              max={365}
              value={retention}
              onChange={(e) => setRetention(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
              disabled={!enabled}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
            />
          </label>
        </div>

        {policy && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 type-mono text-[12px]">
            <div className="flex items-center gap-3">
              <dt className="type-eyebrow">— LAST RUN</dt>
              <dd style={{ color: "var(--color-muted)" }}>
                {relativePast(policy.last_run_at)}
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <dt className="type-eyebrow">— NEXT SCHEDULED</dt>
              <dd style={{ color: "var(--color-muted)" }}>
                {nextRunLabel({
                  ...policy,
                  enabled,
                  frequency: enabled ? frequency : "disabled",
                  time_utc: `${timeUtc}:00`,
                  retention_days: retention,
                })}
              </dd>
            </div>
          </dl>
        )}

        {error && (
          <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
            {error}
          </p>
        )}
        {okMsg && (
          <p className="type-mono text-[12px]" style={{ color: "var(--color-success, #2f6b3a)" }}>
            {okMsg}
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}
