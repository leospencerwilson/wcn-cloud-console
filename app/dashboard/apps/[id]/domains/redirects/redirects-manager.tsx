"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconLink, IconRefresh, IconTrash } from "@/components/ui/icons";
import type { RedirectRule } from "@/lib/provisioner/types";

export default function RedirectsManager({
  slug,
  appId,
}: {
  slug: string;
  appId: string;
}) {
  const [rules, setRules] = useState<RedirectRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromHost, setFromHost] = useState("");
  const [fromPath, setFromPath] = useState("/");
  const [toUrl, setToUrl] = useState("");
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/redirects`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setRules((await res.json()) as RedirectRule[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, appId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/redirects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from_host: fromHost.trim().toLowerCase(),
          from_path: fromPath.trim() || "/",
          to_url: toUrl.trim(),
          status_code: statusCode,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setFromHost("");
      setFromPath("/");
      setToUrl("");
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this redirect?")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/apps/${appId}/redirects/${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
      } else {
        fetchRules();
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
        <h3 className="type-eyebrow">§ HTTP REDIRECTS</h3>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          301/302 redirects from a host+path to a destination URL.
        </p>
      </div>

      <div
        className="px-4 py-3 type-mono text-[12px]"
        style={{
          background: "rgba(200,140,40,0.08)",
          color: "var(--color-ink)",
          borderRadius: 2,
          border: "1px solid rgba(200,140,40,0.3)",
        }}
      >
        ⚠ Redirects are configured but not yet active. Wire-up to Caddy follows in a later release.
      </div>

      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ NEW REDIRECT</span>
        </div>
        <form onSubmit={onCreate} className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">From host</span>
            <input
              required
              value={fromHost}
              onChange={(e) => setFromHost(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="old.example.com"
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">From path</span>
            <input
              value={fromPath}
              onChange={(e) => setFromPath(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="/"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="type-eyebrow text-[10px]">To URL</span>
            <input
              required
              type="url"
              value={toUrl}
              onChange={(e) => setToUrl(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="https://new.example.com"
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Status code</span>
            <select
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value) as 301 | 302)}
              className="type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
                color: "var(--color-ink)",
              }}
            >
              <option value={301}>301 (permanent)</option>
              <option value={302}>302 (temporary)</option>
            </select>
          </label>
          <div className="md:col-span-3">
            <div className="vm-action-group" role="group" aria-label="Redirect actions">
              <button type="submit" className="vm-action vm-action--start" disabled={creating}>
                <IconLink />
                <span>{creating ? "Adding…" : "Add redirect"}</span>
              </button>
            </div>
          </div>
        </form>
      </Card>

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
          <span className="type-eyebrow">§ CONFIGURED REDIRECTS</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchRules}>
            <IconRefresh />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {rules.length === 0 && !loading ? (
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No redirects configured.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">From</th>
                <th className="text-left px-6 py-2 type-eyebrow">To</th>
                <th className="text-left px-6 py-2 type-eyebrow">Code</th>
                <th className="text-left px-6 py-2 type-eyebrow">Created</th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr
                  key={r.id}
                  className="border-t"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-6 py-3 type-mono text-[12px]">
                    {r.from_host}
                    <span style={{ color: "var(--color-muted)" }}>{r.from_path}</span>
                  </td>
                  <td
                    className="px-6 py-3 type-mono text-[12px]"
                    style={{ wordBreak: "break-all" }}
                  >
                    {r.to_url}
                  </td>
                  <td className="px-6 py-3 type-mono text-[12px]">{r.status_code}</td>
                  <td
                    className="px-6 py-3 type-mono text-[11px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={deleting !== null}
                      onClick={() => onDelete(r.id)}
                      style={{ color: "var(--color-danger, #b03020)" }}
                    >
                      <IconTrash />
                      {deleting === r.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
