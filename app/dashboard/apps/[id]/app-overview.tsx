"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { statusPill } from "@/lib/utils";
import {
  IconRocket,
  IconRefresh,
  IconRestart,
  IconStop,
  IconPlay,
  IconTrash,
  IconX,
  IconCheck,
} from "@/components/ui/icons";
import type { App, DeployStatus } from "@/lib/provisioner/types";

// Force rebuild gets a hammer to distinguish it from the rocket Deploy
// uses — they sit next to each other in the action group.
function IconHammer() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9" />
      <path d="M17.64 15 22 10.64" />
      <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
    </svg>
  );
}

type Tab = "logs" | "deployments";

const TERMINAL = new Set(["success", "failed", "cancelled"]);

type LifecycleAction = "restart" | "stop" | "start";

export default function AppOverview({ slug, app }: { slug: string; app: App }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("logs");
  const [deploying, setDeploying] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState<LifecycleAction | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
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
        // Defensive: the route SHOULD return an array (apps-client unwraps the
        // {count, deployments:[]} envelope) but if a future change regresses
        // the shape we don't want render to crash. Coerce to array.
        const raw = (await res.json()) as
          | DeployStatus[]
          | { deployments?: DeployStatus[] }
          | null;
        const list = Array.isArray(raw)
          ? raw
          : raw && Array.isArray(raw.deployments)
            ? raw.deployments
            : [];
        setDeployments(list);
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

  async function onLifecycle(action: LifecycleAction) {
    setLifecycleBusy(action);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/apps/${app.id}/lifecycle/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `${action} failed (${res.status})`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLifecycleBusy(null);
    }
  }

  async function onRollback(deployment_uuid: string) {
    setRollingBack(deployment_uuid);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${app.id}/rollback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deployment_uuid }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Rollback failed (${res.status})`);
      } else {
        router.refresh();
        fetchDeployments();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRollingBack(null);
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
        {/* Deploy actions — segmented group, matches admin VM-action visual */}
        <div className="vm-action-group" role="group" aria-label="Deploy">
          <button
            type="button"
            className="vm-action vm-action--start"
            disabled={deploying}
            onClick={() => onDeploy(false)}
            title="Trigger a fresh deployment"
          >
            <IconRocket />
            <span>{deploying ? "Triggering…" : "Deploy"}</span>
          </button>
          <button
            type="button"
            className="vm-action vm-action--rebuild"
            disabled={deploying}
            onClick={() => onDeploy(true)}
            title="Rebuild without using the layer cache"
          >
            <IconHammer />
            <span>Force rebuild</span>
          </button>
        </div>

        {/* Lifecycle actions — restart / stop / start */}
        <div className="vm-action-group" role="group" aria-label="Lifecycle">
          <button
            type="button"
            className="vm-action vm-action--restart"
            disabled={lifecycleBusy !== null || app.status !== "running"}
            onClick={() => onLifecycle("restart")}
            title="Restart the running container"
          >
            <IconRestart />
            <span>{lifecycleBusy === "restart" ? "Restarting…" : "Restart"}</span>
          </button>
          <button
            type="button"
            className="vm-action vm-action--stop"
            disabled={lifecycleBusy !== null || app.status === "stopped"}
            onClick={() => onLifecycle("stop")}
            title="Stop the container"
          >
            <IconStop />
            <span>{lifecycleBusy === "stop" ? "Stopping…" : "Stop"}</span>
          </button>
          <button
            type="button"
            className="vm-action vm-action--start"
            disabled={lifecycleBusy !== null || app.status === "running"}
            onClick={() => onLifecycle("start")}
            title="Start the container"
          >
            <IconPlay />
            <span>{lifecycleBusy === "start" ? "Starting…" : "Start"}</span>
          </button>
        </div>

        <div className="flex-1" />
        {!deleteConfirming ? (
          <div className="vm-action-group" role="group" aria-label="Delete">
            <button
              type="button"
              className="vm-action vm-action--stop"
              onClick={() => setDeleteConfirming(true)}
              title="Delete this app (asks for confirmation)"
            >
              <IconTrash />
              <span>Delete app</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              Sure?
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirming(false)}>
              <IconX />
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onDelete}
              style={{ background: "var(--color-danger, #b03020)" }}
            >
              <IconCheck />
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
                  <IconRefresh />
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
                  <IconRefresh />
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
                      <th className="px-6 py-2"></th>
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
                          <Link
                            href={`/dashboard/apps/${app.id}/deployments/${d.deployment_uuid}`}
                            style={{ color: "var(--color-navy)" }}
                          >
                            {d.deployment_uuid.slice(0, 8)}…
                          </Link>
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
                        <td className="px-6 py-3 text-right">
                          {d.status === "success" && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={rollingBack !== null || app.status === "building"}
                              onClick={() => onRollback(d.deployment_uuid)}
                              title="Redeploy this build"
                            >
                              <IconRocket />
                              {rollingBack === d.deployment_uuid ? "Rolling back…" : "Rollback"}
                            </button>
                          )}
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
