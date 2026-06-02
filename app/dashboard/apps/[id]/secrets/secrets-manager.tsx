"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  IconSave,
  IconRefresh,
  IconEye,
  IconTrash,
  IconX,
  IconKey,
} from "@/components/ui/icons";
import type { Secret } from "@/lib/provisioner/types";

const KEY_RE = /^[A-Z][A-Z0-9_]{0,63}$/;
const REVEAL_TTL_MS = 30000;

type Revealed = { key: string; value: string; expiresAt: number };

export default function SecretsManager({
  slug,
  appId,
}: {
  slug: string;
  appId: string;
}) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Revealed | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/secrets`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setSecrets((await res.json()) as Secret[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, appId]);

  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  // Auto-clear revealed value after TTL.
  useEffect(() => {
    if (!revealed) return;
    const remaining = revealed.expiresAt - Date.now();
    if (remaining <= 0) {
      setRevealed(null);
      return;
    }
    const t = setTimeout(() => setRevealed(null), remaining);
    return () => clearTimeout(t);
  }, [revealed]);

  async function onUpsert(e: React.FormEvent) {
    e.preventDefault();
    if (!KEY_RE.test(key)) {
      setError("Key must be UPPER_SNAKE_CASE, ≤64 chars.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/secrets`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify([{ key, value }]),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setKey("");
      setValue("");
      fetchSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function onRevealSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!revealKey) return;
    setRevealing(true);
    setRevealError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/secrets/reveal`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: revealKey, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        if (data.code === "bad_password") {
          setRevealError("Password didn't match.");
        } else {
          setRevealError(data.error || `HTTP ${res.status}`);
        }
        return;
      }
      const data = (await res.json()) as { key: string; value: string };
      setRevealed({
        key: data.key,
        value: data.value,
        expiresAt: Date.now() + REVEAL_TTL_MS,
      });
      setRevealKey(null);
      setPassword("");
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRevealing(false);
    }
  }

  async function onDelete(k: string) {
    if (!confirm(`Delete secret "${k}"? This cannot be undone.`)) return;
    setDeleting(k);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/apps/${appId}/secrets/${encodeURIComponent(k)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
      } else {
        fetchSecrets();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="type-eyebrow">§ SECRETS</h3>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          Encrypted at rest with AES-256-GCM. Separate from regular environment variables.
          Values are never sent to the browser except via the reveal flow.
        </p>
      </div>

      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ ADD / UPDATE</span>
        </div>
        <form onSubmit={onUpsert} className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Key</span>
            <input
              required
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="DATABASE_URL"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="type-eyebrow text-[10px]">Value</span>
            <input
              required
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="postgres://…"
              autoComplete="new-password"
            />
          </label>
          <div className="md:col-span-3">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <IconSave />
              {saving ? "Saving…" : "Save secret"}
            </button>
          </div>
        </form>
      </Card>

      {revealed && (
        <div
          className="px-4 py-3 type-mono text-[12px] flex items-center justify-between gap-4"
          style={{
            background: "var(--color-charcoal, #1a1a1a)",
            color: "var(--color-ivory, #f4f1ea)",
            borderRadius: 2,
          }}
        >
          <div className="flex-1" style={{ wordBreak: "break-all" }}>
            <div className="type-eyebrow text-[10px]" style={{ opacity: 0.6 }}>
              {revealed.key} · clears in 30s · not copied to clipboard
            </div>
            <div className="mt-1">{revealed.value}</div>
          </div>
          <button
            type="button"
            onClick={() => setRevealed(null)}
            className="type-mono text-[11px] px-2 py-1"
            style={{
              background: "transparent",
              color: "var(--color-ivory, #f4f1ea)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 2,
            }}
          >
            hide
          </button>
        </div>
      )}

      {error && (
        <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
          {error}
        </p>
      )}

      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ STORED SECRETS</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchSecrets}>
            <IconRefresh />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {secrets.length === 0 && !loading ? (
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No secrets stored yet.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">Key</th>
                <th className="text-left px-6 py-2 type-eyebrow">Value</th>
                <th className="text-left px-6 py-2 type-eyebrow">Created</th>
                <th className="text-left px-6 py-2 type-eyebrow">Last rotated</th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {secrets.map((s) => (
                <tr
                  key={s.key}
                  className="border-t"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-6 py-3 type-mono text-[12px]">{s.key}</td>
                  <td
                    className="px-6 py-3 type-mono text-[12px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    ••••••••
                  </td>
                  <td
                    className="px-6 py-3 type-mono text-[11px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td
                    className="px-6 py-3 type-mono text-[11px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {s.last_rotated_at ? new Date(s.last_rotated_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-6 py-3 text-right space-x-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setRevealKey(s.key);
                        setPassword("");
                        setRevealError(null);
                      }}
                    >
                      <IconEye />
                      Reveal
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={deleting !== null}
                      onClick={() => onDelete(s.key)}
                      style={{ color: "var(--color-danger, #b03020)" }}
                    >
                      <IconTrash />
                      {deleting === s.key ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {revealKey && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}
          onClick={() => !revealing && setRevealKey(null)}
        >
          <Card>
            <form
              onSubmit={onRevealSubmit}
              className="px-6 py-5 space-y-3 max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="type-eyebrow">§ REVEAL SECRET</p>
              <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
                Re-enter your password to view{" "}
                <code style={{ color: "var(--color-ink)" }}>{revealKey}</code>. The value will
                appear for 30 seconds, then auto-hide.
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoFocus
                autoComplete="current-password"
                className="w-full type-mono text-[13px] px-3 py-2"
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 2,
                }}
              />
              {revealError && (
                <p
                  className="type-mono text-[12px]"
                  style={{ color: "var(--color-danger, #b03020)" }}
                >
                  {revealError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setRevealKey(null)}
                  disabled={revealing}
                >
                  <IconX />
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={revealing || !password}>
                  <IconKey />
                  {revealing ? "Verifying…" : "Reveal"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
