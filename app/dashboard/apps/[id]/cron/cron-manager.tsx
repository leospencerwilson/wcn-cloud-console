"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { statusPill } from "@/lib/utils";
import type { CronTask } from "@/lib/provisioner/types";

export default function CronManager({
  slug,
  appId,
}: {
  slug: string;
  appId: string;
}) {
  const [tasks, setTasks] = useState<CronTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [frequency, setFrequency] = useState("0 3 * * *");
  const [container, setContainer] = useState("");
  const [creating, setCreating] = useState(false);

  const [deletingUuid, setDeletingUuid] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/cron`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setTasks((await res.json()) as CronTask[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, appId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/cron`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          command: command.trim(),
          frequency: frequency.trim(),
          container: container.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setName("");
      setCommand("");
      setFrequency("0 3 * * *");
      setContainer("");
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(uuid: string) {
    if (!confirm("Delete this cron task?")) return;
    setDeletingUuid(uuid);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/cron/${uuid}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
      } else {
        fetchTasks();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setDeletingUuid(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ NEW SCHEDULED TASK</span>
        </div>
        <form onSubmit={onCreate} className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="nightly-cleanup"
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Frequency (cron)</span>
            <input
              required
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="0 3 * * *"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="type-eyebrow text-[10px]">Command</span>
            <input
              required
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="php artisan schedule:run"
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Container (optional)</span>
            <input
              value={container}
              onChange={(e) => setContainer(e.target.value)}
              className="w-full type-mono text-[13px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
              placeholder="app"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? "Adding…" : "Add task"}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ SCHEDULED TASKS</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchTasks}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <p
            className="px-6 py-3 type-mono text-[12px]"
            style={{ color: "var(--color-danger, #b03020)" }}
          >
            {error}
          </p>
        )}

        {tasks.length === 0 && !loading ? (
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No scheduled tasks yet.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">Name</th>
                <th className="text-left px-6 py-2 type-eyebrow">Cron</th>
                <th className="text-left px-6 py-2 type-eyebrow">Command</th>
                <th className="text-left px-6 py-2 type-eyebrow">Last run</th>
                <th className="px-6 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr
                  key={t.task_uuid}
                  className="border-t"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-6 py-3 type-mono text-[12px]">{t.name}</td>
                  <td className="px-6 py-3 type-mono text-[12px]">{t.frequency}</td>
                  <td
                    className="px-6 py-3 type-mono text-[11px]"
                    style={{ color: "var(--color-muted)", wordBreak: "break-all" }}
                  >
                    {t.command}
                  </td>
                  <td className="px-6 py-3 type-mono text-[12px]">
                    {t.last_run_at ? (
                      <div className="flex items-center gap-2">
                        <span className={statusPill(t.last_run_status ?? "pending")}>
                          {t.last_run_status ?? "—"}
                        </span>
                        <span style={{ color: "var(--color-muted)" }}>
                          {new Date(t.last_run_at).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-muted)" }}>never</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={deletingUuid !== null}
                      onClick={() => onDelete(t.task_uuid)}
                      style={{ color: "var(--color-danger, #b03020)" }}
                    >
                      {deletingUuid === t.task_uuid ? "Deleting…" : "Delete"}
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
