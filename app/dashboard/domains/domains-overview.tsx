"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { IconPlus, IconX, IconCopy, IconExternal, IconCheck, IconArrowRight } from "@/components/ui/icons";
import { domainPill } from "@/lib/domain-status";
import type { App, AppDomain } from "@/lib/provisioner/types";

const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

type Row = { app: App; domain: AppDomain };

function isTerminal(d: AppDomain): boolean {
  return (
    d.status === "active" || d.status === "failed" || d.status === "deleted"
  );
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function DomainsOverview({ slug }: { slug: string }) {
  const [apps, setApps] = useState<App[] | null>(null);
  const [byApp, setByApp] = useState<Record<string, AppDomain[]>>({});
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshApp = useCallback(
    async (appId: string) => {
      try {
        const res = await fetch(
          `/api/customers/${slug}/apps/${appId}/domains`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as AppDomain[];
        setByApp((prev) => ({ ...prev, [appId]: data }));
      } catch {
        /* swallow */
      }
    },
    [slug],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/customers/${slug}/apps`, {
          cache: "no-store",
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `${r.status}`);
        }
        const list = (await r.json()) as App[];
        if (!alive) return;
        setApps(list);
        const results = await Promise.all(
          list.map(async (a) => {
            try {
              const dr = await fetch(
                `/api/customers/${slug}/apps/${a.id}/domains`,
                { cache: "no-store" },
              );
              if (!dr.ok) return [a.id, [] as AppDomain[]] as const;
              return [a.id, (await dr.json()) as AppDomain[]] as const;
            } catch {
              return [a.id, [] as AppDomain[]] as const;
            }
          }),
        );
        if (!alive) return;
        setByApp(Object.fromEntries(results));
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const rows = useMemo<Row[]>(() => {
    if (!apps) return [];
    const out: Row[] = [];
    for (const a of apps) {
      const ds = byApp[a.id] ?? [];
      for (const d of ds) {
        if (d.status === "deleted") continue;
        out.push({ app: a, domain: d });
      }
    }
    out.sort((a, b) => a.domain.hostname.localeCompare(b.domain.hostname));
    return out;
  }, [apps, byApp]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.domain.hostname.toLowerCase().includes(needle) ||
        r.app.name.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  // Poll pending domains every 30s; auto-stop after 5min per pending domain.
  const pendingFirstSeenRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const now = Date.now();
    const pending = rows.filter((r) => !isTerminal(r.domain));
    pending.forEach((r) => {
      const k = `${r.app.id}:${r.domain.hostname}`;
      if (!pendingFirstSeenRef.current.has(k)) {
        pendingFirstSeenRef.current.set(k, now);
      }
    });
    const stillPolling = pending.filter((r) => {
      const k = `${r.app.id}:${r.domain.hostname}`;
      const first = pendingFirstSeenRef.current.get(k) ?? now;
      return now - first < 5 * 60_000;
    });
    if (stillPolling.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      const appIds = new Set(stillPolling.map((r) => r.app.id));
      appIds.forEach((id) => refreshApp(id));
    }, 30000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [rows, refreshApp]);

  return (
    <>
      <section className="surface-card" style={{ padding: 0 }}>
        <div
          className="flex items-center gap-3 flex-wrap"
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="type-h3">All domains</div>
          {apps && (
            <span
              className="type-mono"
              style={{ fontSize: 11, color: "var(--text-3)" }}
            >
              {rows.length} across {apps.length} app
              {apps.length === 1 ? "" : "s"}
            </span>
          )}
          <input
            className="field-input"
            placeholder="Filter hostnames or apps…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ marginLeft: "auto", maxWidth: 240, fontSize: 12 }}
          />
          <div className="vm-action-group" role="group" aria-label="Add domain">
            <button
              type="button"
              className="vm-action vm-action--start"
              onClick={() => setShowAdd(true)}
            >
              <IconPlus />
              <span>Add domain</span>
            </button>
          </div>
        </div>

        {err && (
          <div
            className="type-mono text-[12px]"
            style={{ color: "var(--crit)", padding: "12px 22px" }}
          >
            {err}
          </div>
        )}

        {!apps && !err && (
          <div
            className="type-mono text-[12px]"
            style={{ color: "var(--text-3)", padding: "12px 22px" }}
          >
            Loading…
          </div>
        )}

        {apps && filtered.length === 0 && (
          <div
            className="text-[13px]"
            style={{ color: "var(--text-3)", padding: "16px 22px" }}
          >
            {rows.length === 0
              ? "No custom domains in this environment yet."
              : "No matches."}
          </div>
        )}

        {apps && filtered.length > 0 && (
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Hostname</th>
                <th style={{ textAlign: "left" }}>App</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Activated</th>
                <th style={{ textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ app, domain }) => {
                const pill = domainPill(domain);
                return (
                  <tr key={`${app.id}:${domain.hostname}`}>
                    <td
                      className="type-mono"
                      style={{ fontSize: 12.5 }}
                    >
                      {domain.hostname}
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/apps/${app.id}`}
                        style={{
                          color: "var(--text)",
                          textDecoration: "none",
                        }}
                      >
                        {app.name}
                      </Link>
                    </td>
                    <td>
                      <span className={pill.className} title={pill.hint}>
                        {pill.label}
                      </span>
                    </td>
                    <td
                      className="type-mono"
                      style={{ fontSize: 11, color: "var(--text-3)" }}
                    >
                      {domain.activated_at
                        ? relTime(domain.activated_at)
                        : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/dashboard/apps/${app.id}/domains/${encodeURIComponent(domain.hostname)}`}
                        className="type-mono"
                        style={{
                          fontSize: 12,
                          color: "var(--brand)",
                          textDecoration: "none",
                        }}
                      >
                        <IconArrowRight />
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {showAdd && apps && (
        <AddDomainModal
          slug={slug}
          apps={apps}
          onClose={() => setShowAdd(false)}
          onCreated={(appId) => {
            refreshApp(appId);
          }}
        />
      )}
    </>
  );
}

function AddDomainModal({
  slug,
  apps,
  onClose,
  onCreated,
}: {
  slug: string;
  apps: App[];
  onClose: () => void;
  onCreated: (appId: string) => void;
}) {
  const [appId, setAppId] = useState(apps[0]?.id ?? "");
  const [hostname, setHostname] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<AppDomain | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const h = hostname.trim().toLowerCase();
    if (!HOSTNAME_RE.test(h)) {
      setErr("Enter a valid hostname (e.g. app.example.com).");
      return;
    }
    if (!appId) {
      setErr("Pick an app.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/customers/${slug}/apps/${appId}/domains`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hostname: h }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = (data as { code?: string }).code;
        if (code === "invalid_hostname") setErr("That hostname isn't valid.");
        else if (code === "reserved_hostname")
          setErr("That hostname is reserved by WCN.");
        else if (code === "hostname_taken")
          setErr("That hostname is already in use.");
        else
          setErr(
            (data as { error?: string }).error || `Failed (${res.status})`,
          );
        return;
      }
      setCreated(data as AppDomain);
      onCreated(appId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function copyTarget() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.cname_target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel modal-panel--lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="type-h3">
            {created ? "Domain added — finish DNS" : "Add custom domain"}
          </div>
        </div>

        {!created && (
          <form onSubmit={submit}>
            <div className="modal-body" style={{ display: "grid", gap: 14 }}>
              <label
                className="type-mono"
                style={{ fontSize: 11, color: "var(--text-3)" }}
              >
                App
                <select
                  className="field-input"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  style={{ marginTop: 6, width: "100%" }}
                >
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="type-mono"
                style={{ fontSize: 11, color: "var(--text-3)" }}
              >
                Hostname
                <input
                  className="field-input"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="app.example.com"
                  autoComplete="off"
                  style={{ marginTop: 6, width: "100%" }}
                />
              </label>
              <p
                className="text-[12px]"
                style={{ color: "var(--text-3)", margin: 0 }}
              >
                We&apos;ll register the hostname with Cloudflare and wire it
                into the tunnel. You&apos;ll get a CNAME target to point at
                next.
              </p>
              {err && (
                <div
                  className="type-mono text-[12px]"
                  style={{ color: "var(--crit)" }}
                >
                  {err}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div className="vm-action-group" role="group" aria-label="Add domain">
                <button type="button" onClick={onClose} className="vm-action vm-action--stop">
                  <IconX />
                  <span>Cancel</span>
                </button>
                <button type="submit" className="vm-action vm-action--start" disabled={saving}>
                  <IconPlus />
                  <span>{saving ? "Adding…" : "Add domain"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {created && (
          <>
            <div className="modal-body" style={{ display: "grid", gap: 12 }}>
              <p
                className="text-[13px]"
                style={{ color: "var(--text-2)", margin: 0 }}
              >
                Create a CNAME record at your DNS provider:
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr",
                  gap: 8,
                  alignItems: "center",
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                  padding: "12px 14px",
                }}
              >
                <span
                  className="type-mono"
                  style={{ fontSize: 11, color: "var(--text-4)" }}
                >
                  HOST
                </span>
                <code
                  className="type-mono"
                  style={{ fontSize: 12, wordBreak: "break-all" }}
                >
                  {created.hostname}
                </code>
                <span
                  className="type-mono"
                  style={{ fontSize: 11, color: "var(--text-4)" }}
                >
                  TYPE
                </span>
                <code className="type-mono" style={{ fontSize: 12 }}>
                  CNAME
                </code>
                <span
                  className="type-mono"
                  style={{ fontSize: 11, color: "var(--text-4)" }}
                >
                  TARGET
                </span>
                <div className="flex items-center gap-2">
                  <code
                    className="type-mono"
                    style={{
                      fontSize: 12,
                      wordBreak: "break-all",
                      flex: 1,
                    }}
                  >
                    {created.cname_target}
                  </code>
                  <button
                    type="button"
                    onClick={copyTarget}
                    className="btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 11 }}
                  >
                    <IconCopy />
                    {copied ? "copied" : "copy"}
                  </button>
                </div>
              </div>
              <p
                className="type-mono text-[11px]"
                style={{ color: "var(--text-3)", margin: 0 }}
              >
                Cloudflare will issue SSL automatically once the CNAME resolves
                — usually within a couple of minutes. We&apos;ll keep polling
                in the background.
              </p>
            </div>
            <div className="modal-footer">
              <Link
                href={`/dashboard/apps/${appId}/domains/${encodeURIComponent(created.hostname)}`}
                className="btn-ghost"
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  textDecoration: "none",
                }}
              >
                <IconExternal />
                Open in app
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="btn-primary"
                style={{ padding: "6px 14px", fontSize: 12 }}
              >
                <IconCheck />
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
