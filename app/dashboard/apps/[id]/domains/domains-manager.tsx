"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { domainPill } from "@/lib/domain-status";
import Link from "next/link";
import { IconRefresh, IconPlus, IconTrash, IconExternal, IconArrowRight } from "@/components/ui/icons";
import type { AppDomain } from "@/lib/provisioner/types";

const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

function isTerminal(d: AppDomain): boolean {
  return d.status === "active" || d.status === "failed" || d.status === "deleted";
}

function CopyableCname({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        background: "var(--color-charcoal, #1a1a1a)",
        color: "var(--color-ivory, #f4f1ea)",
        borderRadius: 2,
      }}
    >
      <code className="type-mono text-[12px] flex-1" style={{ wordBreak: "break-all" }}>
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className="type-mono text-[11px] px-2 py-1"
        style={{
          background: "transparent",
          color: "var(--color-ivory, #f4f1ea)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 2,
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

export default function DomainsManager({
  slug,
  appId,
  initial,
  loadError,
}: {
  slug: string;
  appId: string;
  initial: AppDomain[];
  loadError: string | null;
}) {
  const [domains, setDomains] = useState<AppDomain[]>(initial);
  const [hostname, setHostname] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/domains`);
      if (res.ok) {
        const data = (await res.json()) as AppDomain[];
        setDomains(data);
      }
    } catch {
      // swallow
    }
  }, [slug, appId]);

  const refreshOne = useCallback(
    async (host: string) => {
      try {
        const res = await fetch(
          `/api/customers/${slug}/apps/${appId}/domains/${encodeURIComponent(host)}`,
        );
        if (res.ok) {
          const fresh = (await res.json()) as AppDomain;
          setDomains((ds) => ds.map((d) => (d.hostname === host ? fresh : d)));
        }
      } catch {
        // swallow
      }
    },
    [slug, appId],
  );

  useEffect(() => {
    const pending = domains.filter((d) => !isTerminal(d));
    if (pending.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      pending.forEach((d) => refreshOne(d.hostname));
    }, 30000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [domains, refreshOne]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const h = hostname.trim().toLowerCase();
    if (!HOSTNAME_RE.test(h)) {
      setError("Enter a valid hostname (e.g. app.example.com).");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/domains`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hostname: h }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (data.code === "invalid_hostname") {
          setError("That hostname isn't valid.");
        } else if (data.code === "reserved_hostname") {
          setError("That hostname is reserved by WCN.");
        } else if (data.code === "hostname_taken") {
          setError("That hostname is already in use.");
        } else {
          setError(data.error || `Failed to add (${res.status})`);
        }
        return;
      }
      const created = (await res.json()) as AppDomain;
      setDomains((ds) => [...ds.filter((d) => d.hostname !== created.hostname), created]);
      setHostname("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setAdding(false);
    }
  }

  async function onRemove(host: string) {
    if (!confirm(`Remove ${host}? This deletes the Cloudflare hostname and tunnel ingress.`)) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/apps/${appId}/domains/${encodeURIComponent(host)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Failed to remove (${res.status})`);
        return;
      }
      setDomains((ds) => ds.filter((d) => d.hostname !== host));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="type-eyebrow">§ CUSTOM DOMAINS</h3>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
            Point a CNAME at the provided target. SSL is issued via Cloudflare
            once propagation completes.
          </p>
        </div>
        <div className="vm-action-group" role="group" aria-label="Domain actions">
          <button type="button" className="vm-action vm-action--view" onClick={refreshAll}>
            <IconRefresh />
            <span>Refresh</span>
          </button>
          <Link
            href={`/dashboard/apps/${appId}/domains/redirects`}
            className="vm-action vm-action--restart"
          >
            <IconArrowRight />
            <span>Manage HTTP redirects</span>
          </Link>
        </div>
      </div>

      {loadError && (
        <Card>
          <div className="px-8 py-6 space-y-2">
            <p className="type-eyebrow">§ COULD NOT LOAD DOMAINS</p>
            <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              {loadError}
            </p>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={onAdd} className="px-6 py-5 flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <label
              htmlFor="hostname"
              className="type-eyebrow"
              style={{ color: "var(--color-muted)" }}
            >
              Hostname
            </label>
            <Input
              id="hostname"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="app.example.com"
              autoComplete="off"
            />
          </div>
          <div className="vm-action-group" role="group" aria-label="Add domain">
            <button
              type="submit"
              className="vm-action vm-action--start"
              disabled={adding}
              title="Add this hostname to the app"
            >
              <IconPlus />
              <span>{adding ? "Adding…" : "Add domain"}</span>
            </button>
          </div>
        </form>
      </Card>

      {error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      )}

      {domains.length === 0 ? (
        <Card>
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No custom domains yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {domains.map((d) => (
            <Card key={d.hostname}>
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="type-mono text-[14px]">{d.hostname}</span>
                    {(() => {
                      const p = domainPill(d);
                      return (
                        <span className={p.className} title={p.hint}>
                          {p.label}
                        </span>
                      );
                    })()}
                    {d.auto_configured && (
                      <span
                        className="type-mono text-[10.5px]"
                        title={`We auto-created the CNAME at ${d.auto_configured.display_name ?? d.auto_configured.provider} in zone ${d.auto_configured.zone}. We'll also clean it up when this domain is removed.`}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 3,
                          background:
                            "color-mix(in oklch, var(--ok) 18%, transparent)",
                          color: "var(--ok)",
                          border:
                            "1px solid color-mix(in oklch, var(--ok) 40%, var(--line))",
                        }}
                      >
                        auto via {d.auto_configured.provider}
                      </span>
                    )}
                    {d.activated_at && (
                      <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                        active since {new Date(d.activated_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="vm-action-group" role="group" aria-label={`Actions for ${d.hostname}`}>
                    <a
                      href={`https://${d.hostname}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vm-action vm-action--view"
                      title="Open in new tab"
                    >
                      <IconExternal />
                      <span>View</span>
                    </a>
                    <button
                      type="button"
                      className="vm-action vm-action--stop"
                      onClick={() => onRemove(d.hostname)}
                    >
                      <IconTrash />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {d.status !== "active" && (
                  <div className="space-y-2">
                    {d.auto_configured ? (
                      <p
                        className="type-mono text-[11px]"
                        style={{ color: "var(--ok)" }}
                      >
                        ✓ CNAME created automatically at{" "}
                        <strong>{d.auto_configured.display_name ?? d.auto_configured.provider}</strong>
                        {" "}in zone <code>{d.auto_configured.zone}</code>. Waiting for SSL
                        provisioning — this typically takes 30s–2min.
                      </p>
                    ) : (
                      <>
                        <p className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                          {d.instructions ||
                            `Add a CNAME record: ${d.hostname} → ${d.cname_target}`}
                        </p>
                        <CopyableCname value={d.cname_target} />
                        <p
                          className="type-mono text-[11px]"
                          style={{ color: "var(--text-4)", marginTop: 6 }}
                        >
                          Tip: connect your DNS provider under{" "}
                          <a
                            href="/dashboard/domains/dns-providers"
                            style={{ color: "var(--brand)" }}
                          >
                            Domains → DNS providers
                          </a>{" "}
                          and we'll add this record for you next time.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {d.verification_errors && d.verification_errors.length > 0 && (
                  <div
                    className="px-3 py-2 type-mono text-[11px]"
                    style={{
                      background: "rgba(176,48,32,0.08)",
                      color: "var(--color-danger, #b03020)",
                      borderRadius: 2,
                    }}
                  >
                    <div className="type-eyebrow text-[10px]">verification errors</div>
                    <ul className="mt-1 space-y-0.5">
                      {d.verification_errors.map((m, i) => (
                        <li key={i}>· {m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {(d.cf_status || d.cf_ssl_status) && (
                  <div
                    className="type-mono text-[11px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    cf: {d.cf_status ?? "—"} · ssl: {d.cf_ssl_status ?? "—"}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
