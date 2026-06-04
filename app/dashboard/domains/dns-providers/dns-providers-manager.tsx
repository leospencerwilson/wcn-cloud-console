"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  IconRefresh,
  IconTrash,
  IconX,
  IconPlus,
  IconCheck,
  IconExternal,
} from "@/components/ui/icons";
import type {
  DnsIntegration,
  DnsProvider,
  DnsProviderMeta,
} from "@/lib/provisioner/dns-client";

type Props = { slug: string; userEmail: string };

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function DnsProvidersManager({ slug, userEmail }: Props) {
  void userEmail; // surfaced via session cookie; kept in signature for future audit annotations
  const [meta, setMeta] = useState<DnsProviderMeta[]>([]);
  const [rows, setRows] = useState<DnsIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, r] = await Promise.all([
        fetch("/api/dns-providers", { cache: "no-store" }).then(async (x) => {
          if (!x.ok) throw new Error(`providers ${x.status}`);
          return (await x.json()) as DnsProviderMeta[];
        }),
        fetch(`/api/customers/${slug}/dns-integrations`, { cache: "no-store" }).then(async (x) => {
          if (!x.ok) throw new Error(`integrations ${x.status}`);
          return (await x.json()) as DnsIntegration[];
        }),
      ]);
      setMeta(m);
      setRows(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function testRow(row: DnsIntegration) {
    const res = await fetch(`/api/customers/${slug}/dns-integrations/${row.id}/test`, {
      method: "POST",
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!d.ok) {
      alert(`Test failed: ${d.error || "unknown error"}`);
    }
    load();
  }

  async function refreshZones(row: DnsIntegration) {
    const res = await fetch(`/api/customers/${slug}/dns-integrations/${row.id}/zones`, {
      method: "POST",
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      alert(`Refresh failed: ${d.error || res.status}`);
    }
    load();
  }

  async function disconnect(row: DnsIntegration) {
    if (
      !confirm(
        `Disconnect "${row.display_name}"? Existing domains that use this integration will keep working — but new CNAMEs won't be auto-created and we won't be able to clean up records when those domains are removed.`,
      )
    )
      return;
    const res = await fetch(`/api/customers/${slug}/dns-integrations/${row.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      alert(d.error || `HTTP ${res.status}`);
      return;
    }
    load();
  }

  return (
    <>
      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ CONNECTED DNS PROVIDERS</span>
          <div className="vm-action-group" role="group" aria-label="Provider actions">
            <button type="button" className="vm-action vm-action--view" onClick={load}>
              <IconRefresh />
              <span>{loading ? "Refreshing…" : "Refresh"}</span>
            </button>
            <button
              type="button"
              className="vm-action vm-action--start"
              onClick={() => setAddOpen(true)}
            >
              <IconPlus />
              <span>Connect provider</span>
            </button>
          </div>
        </div>

        {error && (
          <p
            className="px-6 py-3 type-mono text-[12px]"
            style={{ color: "var(--color-danger, #b03020)" }}
          >
            {error}
          </p>
        )}

        {rows.length === 0 && !loading ? (
          <div className="px-6 py-10 type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
            <p>No DNS providers connected yet.</p>
            <p style={{ marginTop: 6 }}>
              Connect Cloudflare, Route 53, Google Cloud DNS, Vercel, or DigitalOcean and we'll
              auto-create the CNAME for any custom hostname whose apex matches one of your zones.
              Otherwise we fall back to showing you the CNAME to add by hand.
            </p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">Name</th>
                <th className="text-left px-6 py-2 type-eyebrow">Provider</th>
                <th className="text-left px-6 py-2 type-eyebrow">Zones</th>
                <th className="text-left px-6 py-2 type-eyebrow">Last tested</th>
                <th className="text-left px-6 py-2 type-eyebrow">Status</th>
                <th className="text-right px-6 py-2 type-eyebrow">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = meta.find((x) => x.key === r.provider);
                return (
                  <tr key={r.id} className="border-t" style={{ borderColor: "var(--color-hairline)" }}>
                    <td className="px-6 py-3 type-mono text-[12px]">{r.display_name}</td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {m?.label ?? r.provider}
                    </td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      {r.zones_cache.length === 0
                        ? "—"
                        : r.zones_cache
                            .slice(0, 3)
                            .map((z) => z.name)
                            .join(", ") +
                          (r.zones_cache.length > 3 ? ` +${r.zones_cache.length - 3} more` : "")}
                    </td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {relTime(r.last_test_at)}
                    </td>
                    <td className="px-6 py-3 type-mono text-[11px]">
                      {r.last_test_ok === false ? (
                        <span style={{ color: "var(--crit)" }} title={r.last_test_error ?? ""}>
                          ● failing
                        </span>
                      ) : r.last_test_ok === true ? (
                        <span style={{ color: "var(--ok)" }}>● ok</span>
                      ) : (
                        <span style={{ color: "var(--text-4)" }}>● untested</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="vm-action-group" role="group" aria-label="Provider row actions">
                        <button
                          type="button"
                          className="vm-action vm-action--view"
                          onClick={() => testRow(r)}
                          title="Verify the credentials still work"
                        >
                          <IconCheck />
                          <span>Test</span>
                        </button>
                        <button
                          type="button"
                          className="vm-action vm-action--restart"
                          onClick={() => refreshZones(r)}
                          title="Pull the latest list of zones from the provider"
                        >
                          <IconRefresh />
                          <span>Sync zones</span>
                        </button>
                        <button
                          type="button"
                          className="vm-action vm-action--stop"
                          onClick={() => disconnect(r)}
                        >
                          <IconTrash />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {addOpen && (
        <ConnectModal
          slug={slug}
          meta={meta}
          onClose={(reload) => {
            setAddOpen(false);
            if (reload) load();
          }}
        />
      )}
    </>
  );
}

function ConnectModal({
  slug,
  meta,
  onClose,
}: {
  slug: string;
  meta: DnsProviderMeta[];
  onClose: (reload: boolean) => void;
}) {
  const [provider, setProvider] = useState<DnsProvider>(
    (meta[0]?.key as DnsProvider) ?? "cloudflare",
  );
  const [displayName, setDisplayName] = useState("");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const current = meta.find((m) => m.key === provider);

  // Clear fields when switching providers so stale values from one
  // provider don't leak into another's payload.
  useEffect(() => {
    setCreds({});
    setErr(null);
  }, [provider]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/customers/${slug}/dns-integrations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider,
          display_name: displayName.trim(),
          credentials: creds,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error || `HTTP ${res.status}`);
        return;
      }
      onClose(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => onClose(false)}>
      <div
        className="modal-panel modal-panel--xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="modal-header justify-between">
          <span className="type-eyebrow">§ CONNECT DNS PROVIDER</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onClose(false)}
          >
            <IconX />
            Close
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-5">
          {/* Provider picker */}
          <section>
            <span
              className="type-eyebrow text-[10px]"
              style={{ display: "block", marginBottom: 8 }}
            >
              § PROVIDER
            </span>
            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 8,
              }}
            >
              {meta.map((m) => {
                const active = m.key === provider;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setProvider(m.key)}
                    style={{
                      padding: "10px 12px",
                      border: active
                        ? "1px solid var(--brand)"
                        : "1px solid var(--line)",
                      borderRadius: 4,
                      background: active
                        ? "color-mix(in oklch, var(--brand) 12%, var(--surface))"
                        : "var(--surface)",
                      color: "var(--text)",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</div>
                    <div
                      className="type-mono"
                      style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 4 }}
                    >
                      apex {m.apex_supported ? "✓ supported" : "✕ not supported"}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Display name */}
          <section>
            <span
              className="type-eyebrow text-[10px]"
              style={{ display: "block", marginBottom: 6 }}
            >
              § DISPLAY NAME
            </span>
            <input
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`${current?.label ?? "Cloudflare"} — prod account`}
              className="w-full type-mono text-[13px]"
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: 4,
                color: "var(--text)",
                padding: "9px 12px",
              }}
            />
          </section>

          {/* Credentials form (provider-specific) */}
          <section>
            <div
              className="flex items-baseline justify-between"
              style={{ marginBottom: 6 }}
            >
              <span className="type-eyebrow text-[10px]">§ CREDENTIALS</span>
              {current?.docs_url && (
                <a
                  href={current.docs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-mono text-[11px]"
                  style={{
                    color: "var(--brand)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <IconExternal />
                  <span>How do I create a token?</span>
                </a>
              )}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {(current?.fields ?? []).map((f) => (
                <label key={f.name} style={{ display: "block" }}>
                  <span
                    className="type-mono text-[11px]"
                    style={{ display: "block", marginBottom: 4, color: "var(--text-3)" }}
                  >
                    {f.label}
                  </span>
                  {f.type === "textarea" ? (
                    <textarea
                      required
                      rows={6}
                      value={creds[f.name] ?? ""}
                      onChange={(e) =>
                        setCreds((s) => ({ ...s, [f.name]: e.target.value }))
                      }
                      spellCheck={false}
                      className="w-full type-mono text-[12px]"
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        color: "var(--text)",
                        padding: "9px 12px",
                        resize: "vertical",
                      }}
                    />
                  ) : (
                    <input
                      type={f.type === "password" ? "password" : "text"}
                      required={!f.label.includes("(optional)")}
                      value={creds[f.name] ?? ""}
                      onChange={(e) =>
                        setCreds((s) => ({ ...s, [f.name]: e.target.value }))
                      }
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full type-mono text-[13px]"
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        color: "var(--text)",
                        padding: "9px 12px",
                      }}
                    />
                  )}
                  {f.hint && (
                    <p
                      className="type-mono text-[10.5px]"
                      style={{ marginTop: 3, color: "var(--text-4)" }}
                    >
                      {f.hint}
                    </p>
                  )}
                </label>
              ))}
            </div>
            <p
              className="type-mono text-[10.5px]"
              style={{ marginTop: 8, color: "var(--text-4)" }}
            >
              We test these credentials immediately. If they don't work, the connection isn't saved.
              Once stored, they're encrypted at rest and only decrypted server-side when we call
              your provider.
            </p>
          </section>

          {err && (
            <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>
              {err}
            </p>
          )}

          <div
            className="flex items-center justify-end"
            style={{
              gap: 12,
              paddingTop: 14,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div className="vm-action-group" role="group" aria-label="Connect actions">
              <button
                type="button"
                className="vm-action vm-action--stop"
                onClick={() => onClose(false)}
              >
                <IconX />
                <span>Cancel</span>
              </button>
              <button
                type="submit"
                className="vm-action vm-action--start"
                disabled={busy || !displayName.trim()}
              >
                <IconCheck />
                <span>{busy ? "Connecting…" : "Connect + test"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
