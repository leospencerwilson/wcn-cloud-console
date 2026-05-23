"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { ApiToken, ApiTokenCreated } from "@/lib/provisioner/types";

const RESOURCES = ["vms", "apps", "backups", "domains", "secrets", "audit", "metrics"] as const;
const LEVELS = ["read", "write", "admin"] as const;

type Resource = (typeof RESOURCES)[number];
type Level = (typeof LEVELS)[number];

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function compactScopes(scopes: string[]): string {
  return scopes
    .map((s) => {
      const [r, l] = s.split(":");
      return `${r}:${(l ?? "").charAt(0)}`;
    })
    .join(" ");
}

export default function TokensManager({
  slug,
  currentEmail,
}: {
  slug: string;
  currentEmail: string;
}) {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [issued, setIssued] = useState<ApiTokenCreated | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/tokens`, { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setTokens((await res.json()) as ApiToken[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function revoke(t: ApiToken) {
    if (!confirm(`Revoke "${t.name}"? Any service using it will start getting 401s.`))
      return;
    try {
      const res = await fetch(`/api/customers/${slug}/tokens/${t.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }

  const visible = tokens.filter(
    (t) => !t.revoked_at || t.user_email === currentEmail,
  );

  return (
    <>
      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ ACTIVE TOKENS</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setIssued(null);
                setCreateOpen(true);
              }}
            >
              New token
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
        {visible.length === 0 && !loading ? (
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No tokens issued yet.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">Name</th>
                <th className="text-left px-6 py-2 type-eyebrow">Prefix</th>
                <th className="text-left px-6 py-2 type-eyebrow">Scopes</th>
                <th className="text-left px-6 py-2 type-eyebrow">Issued by</th>
                <th className="text-left px-6 py-2 type-eyebrow">Last used</th>
                <th className="text-left px-6 py-2 type-eyebrow">Expires</th>
                <th className="text-right px-6 py-2 type-eyebrow">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const revoked = !!t.revoked_at;
                return (
                  <tr
                    key={t.id}
                    className="border-t"
                    style={{
                      borderColor: "var(--color-hairline)",
                      opacity: revoked ? 0.55 : 1,
                    }}
                  >
                    <td className="px-6 py-3 type-mono text-[12px]">{t.name}</td>
                    <td className="px-6 py-3 type-mono text-[11px]">{t.prefix}</td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {compactScopes(t.scopes)}
                    </td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {t.user_email}
                    </td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {relTime(t.last_used_at)}
                    </td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {revoked ? (
                        <span
                          className="type-mono text-[11px]"
                          style={{ color: "var(--color-muted)" }}
                        >
                          revoked
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => revoke(t)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {createOpen && (
        <CreateModal
          slug={slug}
          onClose={() => {
            setCreateOpen(false);
            setIssued(null);
            load();
          }}
          onIssued={setIssued}
          issued={issued}
        />
      )}
    </>
  );
}

function CreateModal({
  slug,
  onClose,
  onIssued,
  issued,
}: {
  slug: string;
  onClose: () => void;
  onIssued: (t: ApiTokenCreated) => void;
  issued: ApiTokenCreated | null;
}) {
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function toggle(resource: Resource, level: Level) {
    const key = `${resource}:${level}`;
    const next = new Set(scopes);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setScopes(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/tokens`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopes: Array.from(scopes),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      onIssued((await res.json()) as ApiTokenCreated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!issued) return;
    navigator.clipboard.writeText(issued.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl"
        style={{
          background: "var(--color-ivory, #f4f1ea)",
          border: "1px solid var(--color-hairline)",
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">
            § {issued ? "TOKEN ISSUED — COPY NOW" : "NEW API TOKEN"}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-6 py-5">
          {issued ? (
            <div className="space-y-4">
              <div
                className="p-4"
                style={{
                  background: "var(--color-success-bg, #e6f0e8)",
                  border: "1px solid var(--color-success, #2f6b3a)",
                  borderRadius: 2,
                }}
              >
                <p
                  className="type-eyebrow text-[10px] mb-2"
                  style={{ color: "var(--color-success, #2f6b3a)" }}
                >
                  Token — shown only once
                </p>
                <code
                  className="type-mono text-[12px]"
                  style={{ wordBreak: "break-all", display: "block" }}
                >
                  {issued.token}
                </code>
              </div>
              <p
                className="type-mono text-[12px]"
                style={{ color: "var(--color-danger, #b03020)" }}
              >
                ⚠ Store this token securely — it will not be shown again.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
                  {copied ? "Copied!" : "Copy token"}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block space-y-1">
                <span className="type-eyebrow text-[10px]">Name (max 80 chars)</span>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="deploy-bot"
                  autoFocus
                  className="w-full type-mono text-[13px] px-3 py-2"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 2,
                  }}
                />
              </label>

              <fieldset>
                <legend className="type-eyebrow text-[10px] mb-2">Scopes</legend>
                <div className="space-y-2">
                  {RESOURCES.map((r) => (
                    <div key={r} className="flex items-center gap-4">
                      <span
                        className="type-mono text-[12px]"
                        style={{ width: 80, color: "var(--color-muted)" }}
                      >
                        {r}
                      </span>
                      <div className="flex items-center gap-3">
                        {LEVELS.map((l) => (
                          <label
                            key={l}
                            className="flex items-center gap-1 type-mono text-[12px]"
                          >
                            <input
                              type="checkbox"
                              checked={scopes.has(`${r}:${l}`)}
                              onChange={() => toggle(r, l)}
                            />
                            {l}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>

              <label className="block space-y-1">
                <span className="type-eyebrow text-[10px]">Expires (optional)</span>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="type-mono text-[13px] px-3 py-2"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 2,
                  }}
                />
              </label>

              {error && (
                <p
                  className="type-mono text-[12px]"
                  style={{ color: "var(--color-danger, #b03020)" }}
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={busy || !name.trim() || scopes.size === 0}
                >
                  {busy ? "Creating…" : "Create token"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
