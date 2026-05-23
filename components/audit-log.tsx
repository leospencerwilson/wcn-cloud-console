"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type { AuditEvent } from "@/lib/provisioner/types";

const PREFIXES = [
  { value: "", label: "all" },
  { value: "vm.", label: "vm.*" },
  { value: "vm.snapshot.", label: "vm.snapshot.*" },
  { value: "vm.backup.", label: "vm.backup.*" },
  { value: "app.", label: "app.*" },
  { value: "app.exec", label: "app.exec" },
  { value: "app.redirect.", label: "app.redirect.*" },
  { value: "app.secret.", label: "app.secret.*" },
  { value: "domain.", label: "domain.*" },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AuditLog({ slug }: { slug: string }) {
  const defaultSince = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);
  const [since, setSince] = useState<string | null>(defaultSince);
  const [until, setUntil] = useState<string | null>(null);
  const [actionPrefix, setActionPrefix] = useState("");
  const [limit, setLimit] = useState(200);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (since) params.set("since", since);
      if (until) params.set("until", until);
      if (actionPrefix) params.set("action", actionPrefix);
      params.set("limit", String(limit));
      const res = await fetch(`/api/customers/${slug}/audit?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setEvents((await res.json()) as AuditEvent[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, since, until, actionPrefix, limit]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="px-6 py-4 flex flex-wrap items-end gap-4">
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">From</span>
            <input
              type="datetime-local"
              value={toLocalInput(since)}
              onChange={(e) => setSince(fromLocalInput(e.target.value))}
              className="type-mono text-[12px] px-2 py-1"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
                color: "var(--color-ink)",
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">To</span>
            <input
              type="datetime-local"
              value={toLocalInput(until)}
              onChange={(e) => setUntil(fromLocalInput(e.target.value))}
              className="type-mono text-[12px] px-2 py-1"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
                color: "var(--color-ink)",
              }}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Action</span>
            <select
              value={actionPrefix}
              onChange={(e) => setActionPrefix(e.target.value)}
              className="type-mono text-[12px] px-2 py-1"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
                color: "var(--color-ink)",
              }}
            >
              {PREFIXES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Limit</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="type-mono text-[12px] px-2 py-1"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
                color: "var(--color-ink)",
              }}
            >
              {[50, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex-1" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchEvents}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </Card>

      {error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      )}

      <Card>
        {events.length === 0 && !loading ? (
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No events for this filter.
          </p>
        ) : (
          <div style={{ maxHeight: "62vh", overflow: "auto" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">When</th>
                <th className="text-left px-6 py-2 type-eyebrow">Actor</th>
                <th className="text-left px-6 py-2 type-eyebrow">Action</th>
                <th className="text-left px-6 py-2 type-eyebrow">Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr
                  key={e.id}
                  className="border-t"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-6 py-3 type-mono text-[11px]" style={{ whiteSpace: "nowrap" }}>
                    {new Date(e.ts).toLocaleString()}
                  </td>
                  <td
                    className="px-6 py-3 type-mono text-[11px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {e.actor}
                  </td>
                  <td className="px-6 py-3 type-mono text-[12px]">{e.action}</td>
                  <td
                    className="px-6 py-3 type-mono text-[11px]"
                    style={{ color: "var(--color-muted)", wordBreak: "break-all" }}
                  >
                    {e.details ? JSON.stringify(e.details) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  );
}
