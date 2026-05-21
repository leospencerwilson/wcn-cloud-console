"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { statusPill } from "@/lib/utils";
import type { App, DeployStatus } from "@/lib/provisioner/types";

type Tab = "logs" | "deployments";

const TERMINAL = new Set(["success", "failed", "cancelled"]);

export default function AppOverview({ slug, app }: { slug: string; app: App }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("logs");
  const [deploying, setDeploying] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [deployments, setDeployments] = useState<DeployStatus[]>([]);
  const [deploymentsLoading, setDeploymentsLoading] = useState(false);

  const livePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${app.id}/logs?tail=300`);
      if (res.ok) {
        const data = (await res.json()) as { lines: string[] };
        setLogs(data.lines || []);
      }
    } catch {
      // swallow — UI shows empty state
    } finally {
      setLogsLoading(false);
    }
  }, [slug, app.id]);

  const fetchDeployments = useCallback(async () => {
    setDeploymentsLoading(true);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${app.id}/deployments`);
      if (res.ok) {
        const data = (await res.json()) as DeployStatus[];
        setDeployments(data || []);
      }
    } catch {
      // swallow
    } finally {
      setDeploymentsLoading(false);
    }
  }, [slug, app.id]);

  useEffect(() => {
    if (tab === "logs") fetchLogs();
    else fetchDeployments();
  }, [tab, fetchLogs, fetchDeployments]);

  // Poll while a deploy is in-flight (status building / pending).
  useEffect(() => {
    const inFlight = app.status === "building" || app.status === "pending";
    if (!inFlight) return;
    livePollRef.current = setInterval(() => {
      router.refresh();
      if (tab === "deployments") fetchDeployments();
      if (tab === "logs") fetchLogs();
    }, 4000);
    return () => {
      if (livePollRef.current) clearInterval(livePollRef.current);
    };
  }, [app.status, router, tab, fetchDeployments, fetchLogs]);

  async function onDeploy(force: boolean) {
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${app.id}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Deploy failed (${res.status})`);
      } else {
        router.refresh();
        setTab("deployments");
        fetchDeployments();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setDeploying(false);
    }
  }

  async function onDelete() {
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${app.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Delete failed (${res.status})`);
        return;
      }
      router.push("/dashboard/apps");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          className="btn btn-primary"
          disabled={deploying}
          onClick={() => onDeploy(false)}
        >
          {deploying ? "Triggering…" : "Deploy"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={deploying}
          onClick={() => onDeploy(true)}
          title="Rebuild without cache"
        >
          Force rebuild
        </button>
        <div className="flex-1" />
        {!deleteConfirming ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDeleteConfirming(true)}
            style={{ color: "var(--color-danger, #b03020)" }}
          >
            Delete app
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              Sure?
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirming(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onDelete}
              style={{ background: "var(--color-danger, #b03020)" }}
            >
              Confirm delete
            </button>
          </div>
        )}
      </div>

      {error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      )}

      <div
        className="flex gap-1 border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        {(["logs", "deployments"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-4 py-2 type-eyebrow"
            style={{
              color: tab === t ? "var(--color-navy)" : "var(--color-muted)",
              borderBottom: tab === t ? "2px solid var(--color-navy)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <div className="px-2 py-2">
          {tab === "logs" ? (
            <div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="type-eyebrow">§ CONTAINER LOGS</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={fetchLogs}>
                  {logsLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              <pre
                className="px-6 py-4 type-mono text-[12px] whitespace-pre-wrap overflow-auto"
                style={{
                  background: "var(--color-charcoal, #1a1a1a)",
                  color: "var(--color-ivory, #f4f1ea)",
                  maxHeight: 480,
                  borderTop: "1px solid var(--color-hairline)",
                }}
              >
                {logs.length === 0 ? "(no logs yet)" : logs.join("\n")}
              </pre>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between px-6 py-3">
                <span className="type-eyebrow">§ DEPLOYMENT HISTORY</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={fetchDeployments}
                >
                  {deploymentsLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              {deployments.length === 0 ? (
                <p
                  className="px-6 py-6 type-mono text-[12px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  No deployments yet.
                </p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ color: "var(--color-muted)" }}>
                      <th className="text-left px-6 py-2 type-eyebrow">UUID</th>
                      <th className="text-left px-6 py-2 type-eyebrow">Status</th>
                      <th className="text-left px-6 py-2 type-eyebrow">Started</th>
                      <th className="text-left px-6 py-2 type-eyebrow">Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deployments.map((d) => (
                      <tr
                        key={d.deployment_uuid}
                        className="border-t"
                        style={{ borderColor: "var(--color-hairline)" }}
                      >
                        <td className="px-6 py-3 type-mono text-[12px]">
                          {d.deployment_uuid.slice(0, 8)}…
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={statusPill(
                              TERMINAL.has(d.status) ? d.status : "pending",
                            )}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td
                          className="px-6 py-3 type-mono text-[12px]"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {d.started_at ? new Date(d.started_at).toLocaleString() : "—"}
                        </td>
                        <td
                          className="px-6 py-3 type-mono text-[12px]"
                          style={{ color: "var(--color-muted)" }}
                        >
                          {d.finished_at ? new Date(d.finished_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
