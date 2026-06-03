"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh, IconKey, IconTrash, IconX, IconCopy, IconCheck } from "@/components/ui/icons";
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
          <div className="vm-action-group" role="group" aria-label="Token actions">
            <button type="button" className="vm-action vm-action--view" onClick={load}>
              <IconRefresh />
              <span>{loading ? "Refreshing…" : "Refresh"}</span>
            </button>
            <button
              type="button"
              className="vm-action vm-action--start"
              onClick={() => {
                setIssued(null);
                setCreateOpen(true);
              }}
            >
              <IconKey />
              <span>New token</span>
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
                        <div className="vm-action-group" role="group" aria-label="Revoke token">
                          <button
                            type="button"
                            className="vm-action vm-action--stop"
                            onClick={() => revoke(t)}
                          >
                            <IconTrash />
                            <span>Revoke</span>
                          </button>
                        </div>
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

// Short human label for each resource so the modal doesn't read like
// the type definition. Keys match RESOURCES exactly.
const RESOURCE_HINT: Record<Resource, string> = {
  vms: "Virtual machines",
  apps: "Customer applications",
  backups: "Database + storage backups",
  domains: "Custom domains + DNS",
  secrets: "Secrets + env vars",
  audit: "Audit log",
  metrics: "Metrics + observability",
};

type ExpiryPreset = "7d" | "30d" | "90d" | "never" | "custom";

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
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>("30d");
  const [customDate, setCustomDate] = useState("");
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

  function applyPreset(preset: "all-read" | "all-write" | "all-admin" | "reset") {
    if (preset === "reset") {
      setScopes(new Set());
      return;
    }
    const level: Level =
      preset === "all-read" ? "read" : preset === "all-write" ? "write" : "admin";
    const next = new Set(scopes);
    for (const r of RESOURCES) next.add(`${r}:${level}`);
    setScopes(next);
  }

  function resolvedExpiry(): string | null {
    if (expiryPreset === "never") return null;
    if (expiryPreset === "custom") return customDate ? new Date(customDate).toISOString() : null;
    const days = expiryPreset === "7d" ? 7 : expiryPreset === "30d" ? 30 : 90;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
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
          expires_at: resolvedExpiry(),
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

  const scopeCount = scopes.size;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel modal-panel--xl" onClick={(e) => e.stopPropagation()}>
        {/* Scoped iPhone-style toggle CSS. The class names are prefixed so
            they won't collide with anything else; injected as a <style>
            sibling at the top of the modal so the rules are present before
            React renders the children that use them. */}
        <IphoneToggleStyles />
        <div className="modal-header justify-between">
          <span className="type-eyebrow">
            § {issued ? "TOKEN ISSUED — COPY NOW" : "NEW API TOKEN"}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <IconX />
            Close
          </button>
        </div>
        <div className="px-6 py-5">
          {issued ? (
            <div className="space-y-4">
              <div
                className="p-4"
                style={{
                  background:
                    "color-mix(in oklch, var(--ok) 14%, var(--surface))",
                  border:
                    "1px solid color-mix(in oklch, var(--ok) 45%, var(--line))",
                  borderRadius: "var(--r-2)",
                  color: "var(--text)",
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
              <div className="flex justify-end">
                <div className="vm-action-group" role="group" aria-label="Token actions">
                  <button type="button" className="vm-action vm-action--view" onClick={copy}>
                    <IconCopy />
                    <span>{copied ? "Copied!" : "Copy token"}</span>
                  </button>
                  <button type="button" className="vm-action vm-action--start" onClick={onClose}>
                    <IconCheck />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {/* ── NAME ─────────────────────────────────────────── */}
              <section>
                <div
                  className="flex items-baseline justify-between"
                  style={{ marginBottom: 6 }}
                >
                  <span className="type-eyebrow text-[10px]">§ NAME</span>
                  <span
                    className="type-mono text-[10px]"
                    style={{ color: "var(--text-4)" }}
                  >
                    {name.length}/80
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="deploy-bot"
                  autoFocus
                  className="w-full type-mono text-[13px]"
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    color: "var(--text)",
                    padding: "9px 12px",
                  }}
                />
                <p
                  className="type-mono text-[11px]"
                  style={{ marginTop: 4, color: "var(--text-4)" }}
                >
                  Shown in the token list + audit log entries so you can see which service used the token.
                </p>
              </section>

              {/* ── SCOPES ───────────────────────────────────────── */}
              <section>
                <div
                  className="flex items-baseline justify-between flex-wrap"
                  style={{ marginBottom: 8, gap: 12 }}
                >
                  <span className="type-eyebrow text-[10px]">
                    § SCOPES{" "}
                    <span style={{ color: "var(--text-4)", marginLeft: 4 }}>
                      ({scopeCount} selected)
                    </span>
                  </span>
                  <div
                    className="vm-action-group"
                    role="group"
                    aria-label="Scope presets"
                  >
                    <button
                      type="button"
                      className="vm-action vm-action--view"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => applyPreset("all-read")}
                      title="Add :read for every resource"
                    >
                      All read
                    </button>
                    <button
                      type="button"
                      className="vm-action vm-action--view"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => applyPreset("all-write")}
                      title="Add :write for every resource"
                    >
                      All write
                    </button>
                    <button
                      type="button"
                      className="vm-action vm-action--restart"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => applyPreset("all-admin")}
                      title="Add :admin for every resource"
                    >
                      All admin
                    </button>
                    <button
                      type="button"
                      className="vm-action vm-action--stop"
                      style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => applyPreset("reset")}
                      title="Clear every selection"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="scope-grid">
                  <div className="scope-grid-head">
                    <span style={{ paddingLeft: 12 }}>Resource</span>
                    <span style={{ textAlign: "center" }}>Read</span>
                    <span style={{ textAlign: "center" }}>Write</span>
                    <span style={{ textAlign: "center" }}>Admin</span>
                  </div>
                  {RESOURCES.map((r) => (
                    <div key={r} className="scope-grid-row">
                      <div style={{ paddingLeft: 12 }}>
                        <div
                          className="type-mono text-[13px]"
                          style={{ color: "var(--text)", letterSpacing: 0 }}
                        >
                          {r}
                        </div>
                        <div
                          className="type-mono text-[10.5px]"
                          style={{ color: "var(--text-4)", marginTop: 1 }}
                        >
                          {RESOURCE_HINT[r]}
                        </div>
                      </div>
                      {LEVELS.map((l) => (
                        <div key={l} style={{ display: "flex", justifyContent: "center" }}>
                          <IosSwitch
                            checked={scopes.has(`${r}:${l}`)}
                            onChange={() => toggle(r, l)}
                            ariaLabel={`${r}:${l}`}
                            tone={l === "admin" ? "purple" : l === "write" ? "amber" : "green"}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              {/* ── EXPIRES ──────────────────────────────────────── */}
              <section>
                <span
                  className="type-eyebrow text-[10px]"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  § EXPIRES
                </span>
                <div className="expires-row">
                  {(["7d", "30d", "90d", "never", "custom"] as ExpiryPreset[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`expires-chip${expiryPreset === p ? " is-active" : ""}`}
                      onClick={() => setExpiryPreset(p)}
                    >
                      {p === "never"
                        ? "Never"
                        : p === "custom"
                          ? "Custom…"
                          : p === "7d"
                            ? "7 days"
                            : p === "30d"
                              ? "30 days"
                              : "90 days"}
                    </button>
                  ))}
                  {expiryPreset === "custom" && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="type-mono text-[12px]"
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        color: "var(--text)",
                        padding: "5px 8px",
                        marginLeft: 4,
                      }}
                    />
                  )}
                </div>
              </section>

              {error && (
                <p
                  className="type-mono text-[12px]"
                  style={{ color: "var(--color-danger, #b03020)" }}
                >
                  {error}
                </p>
              )}

              <div
                className="flex items-center justify-between flex-wrap"
                style={{
                  gap: 12,
                  paddingTop: 14,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <span
                  className="type-mono text-[11px]"
                  style={{ color: "var(--text-4)" }}
                >
                  {scopeCount === 0
                    ? "Pick at least one scope"
                    : `${scopeCount} scope${scopeCount === 1 ? "" : "s"} · ${
                        expiryPreset === "never"
                          ? "never expires"
                          : expiryPreset === "custom"
                            ? customDate
                              ? `expires ${customDate}`
                              : "pick a date"
                            : `expires in ${expiryPreset}`
                      }`}
                </span>
                <div className="vm-action-group" role="group" aria-label="Token actions">
                  <button type="button" className="vm-action vm-action--stop" onClick={onClose}>
                    <IconX />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    className="vm-action vm-action--start"
                    disabled={
                      busy ||
                      !name.trim() ||
                      scopes.size === 0 ||
                      (expiryPreset === "custom" && !customDate)
                    }
                  >
                    <IconKey />
                    <span>{busy ? "Creating…" : "Create token"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function IosSwitch({
  checked,
  onChange,
  ariaLabel,
  tone,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  tone: "green" | "amber" | "purple";
}) {
  return (
    <label className={`ios-switch ios-switch--${tone}`} aria-label={ariaLabel}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="ios-switch-input"
      />
      <span className="ios-switch-track">
        <span className="ios-switch-thumb" aria-hidden />
      </span>
    </label>
  );
}

// One-time injection of the iPhone-toggle + scope-grid + expires-chip CSS.
// Lives next to the component so the modal is self-contained.
function IphoneToggleStyles() {
  return (
    <style>{`
.ios-switch {
  --w: 40px;
  --h: 22px;
  --pad: 2px;
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.ios-switch-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.ios-switch-track {
  width: var(--w);
  height: var(--h);
  border-radius: 999px;
  background: color-mix(in oklch, var(--text-4) 35%, var(--bg-2));
  border: 1px solid var(--line);
  transition: background .18s ease, border-color .18s ease;
  position: relative;
  display: inline-block;
}
.ios-switch-thumb {
  position: absolute;
  top: var(--pad);
  left: var(--pad);
  width: calc(var(--h) - var(--pad) * 2 - 2px);
  height: calc(var(--h) - var(--pad) * 2 - 2px);
  background: #fff;
  border-radius: 50%;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.18),
    0 1px 2px rgba(0, 0, 0, 0.12);
  transition: transform .2s cubic-bezier(.4, 0, .2, 1);
}
.ios-switch-input:checked + .ios-switch-track .ios-switch-thumb {
  transform: translateX(calc(var(--w) - var(--h)));
}
.ios-switch--green .ios-switch-input:checked + .ios-switch-track {
  background: var(--ok);
  border-color: var(--ok);
}
.ios-switch--amber .ios-switch-input:checked + .ios-switch-track {
  background: var(--warn);
  border-color: var(--warn);
}
.ios-switch--purple .ios-switch-input:checked + .ios-switch-track {
  background: var(--brand);
  border-color: var(--brand);
}
.ios-switch-input:focus-visible + .ios-switch-track {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
.ios-switch:hover .ios-switch-track {
  filter: brightness(1.04);
}

.scope-grid {
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  overflow: hidden;
}
.scope-grid-head,
.scope-grid-row {
  display: grid;
  grid-template-columns: minmax(180px, 2fr) 1fr 1fr 1fr;
  align-items: center;
  gap: 8px;
}
.scope-grid-head {
  background: var(--bg-2);
  border-bottom: 1px solid var(--line);
  padding: 7px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-4);
}
.scope-grid-row {
  padding: 9px 8px;
  border-bottom: 1px solid var(--line);
}
.scope-grid-row:last-child {
  border-bottom: 0;
}
.scope-grid-row:hover {
  background: color-mix(in oklch, var(--brand) 4%, transparent);
}

.expires-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.expires-chip {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text-2);
  cursor: pointer;
  transition: background .14s ease, border-color .14s ease, color .14s ease;
}
.expires-chip:hover {
  border-color: color-mix(in oklch, var(--brand) 45%, var(--line));
  color: var(--text);
}
.expires-chip.is-active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
`}</style>
  );
}
