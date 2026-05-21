"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { statusPill } from "@/lib/utils";
import type { AppDomain } from "@/lib/provisioner/types";

const HOSTNAME_RE =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;

function isPending(d: AppDomain): boolean {
  return d.status === "pending" || d.ssl_status === "pending_validation";
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
          setDomains((ds) =>
            ds.map((d) => (d.hostname === host ? fresh : d)),
          );
        }
      } catch {
        // swallow
      }
    },
    [slug, appId],
  );

  // Poll any pending domains every 8s until they settle.
  useEffect(() => {
    const pending = domains.filter(isPending);
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
    }, 8000);
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
        if (data.code === "not_implemented") {
          setError(
            "Custom domain add isn't wired up on the provisioner yet (PR 3). The list view still works.",
          );
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
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/apps/${appId}/domains/${encodeURIComponent(host)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        if (data.code === "not_implemented") {
          setError("Custom domain delete isn't wired up on the provisioner yet (PR 3).");
        } else {
          setError(data.error || `Failed to remove (${res.status})`);
        }
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
          <p
            className="mt-2 text-[13px]"
            style={{ color: "var(--color-muted)" }}
          >
            Point a CNAME at the provided target. SSL is issued via Cloudflare
            once propagation completes.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={refreshAll}
        >
          Refresh
        </button>
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
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? "Adding…" : "Add domain"}
          </button>
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

      <Card>
        <div className="px-2 py-2">
          {domains.length === 0 ? (
            <p
              className="px-6 py-6 type-mono text-[12px]"
              style={{ color: "var(--color-muted)" }}
            >
              No custom domains yet.
            </p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ color: "var(--color-muted)" }}>
                  <th className="text-left px-6 py-3 type-eyebrow">Hostname</th>
                  <th className="text-left px-6 py-3 type-eyebrow">Status</th>
                  <th className="text-left px-6 py-3 type-eyebrow">SSL</th>
                  <th className="text-left px-6 py-3 type-eyebrow">CNAME target</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr
                    key={d.hostname}
                    className="border-t"
                    style={{ borderColor: "var(--color-hairline)" }}
                  >
                    <td className="px-6 py-4 type-mono text-[12px]">{d.hostname}</td>
                    <td className="px-6 py-4">
                      <span className={statusPill(d.status)}>{d.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={statusPill(
                          d.ssl_status === "active" ? "active" : "pending",
                        )}
                      >
                        {d.ssl_status}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 type-mono text-[12px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {d.cname_target}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onRemove(d.hostname)}
                        style={{ color: "var(--color-danger, #b03020)" }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
