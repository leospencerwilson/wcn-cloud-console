"use client";

import { useEffect, useState } from "react";
import type { CoolifyCronOverview } from "@/lib/provisioner/types";

export default function CronOverview({ slug }: { slug: string }) {
  const [rows, setRows] = useState<CoolifyCronOverview[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    fetch(`/api/customers/${slug}/coolify/cron`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `${r.status}`);
        }
        return r.json();
      })
      .then((d: CoolifyCronOverview[]) => alive && setRows(d))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "failed"));
    return () => {
      alive = false;
    };
  }, [slug]);

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalTasks = rows?.reduce((n, r) => n + r.tasks.length, 0) ?? 0;

  return (
    <section className="surface-card" style={{ padding: 0 }}>
      <div
        className="flex items-baseline justify-between"
        style={{ padding: "16px 22px", borderBottom: "1px solid var(--line)" }}
      >
        <div className="type-h3">Scheduled tasks</div>
        <span
          className="type-mono"
          style={{ fontSize: 11, color: "var(--text-3)" }}
        >
          {rows ? `${totalTasks} task${totalTasks === 1 ? "" : "s"} across ${rows.length} app${rows.length === 1 ? "" : "s"}` : "cron jobs per app"}
        </span>
      </div>

      {err && (
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--crit)", padding: "12px 22px" }}
        >
          {err}
        </div>
      )}
      {!rows && !err && (
        <div style={{ padding: "12px 22px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 14,
                marginBottom: 10,
                borderRadius: 4,
                background:
                  "color-mix(in oklch, var(--line) 70%, transparent)",
                width: `${70 - i * 10}%`,
              }}
            />
          ))}
        </div>
      )}
      {rows && rows.length === 0 && (
        <div
          className="text-[13px]"
          style={{ color: "var(--text-3)", padding: "12px 22px" }}
        >
          No apps in this environment yet.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div>
          {rows.map((app) => {
            const isOpen = open.has(app.app_id);
            return (
              <div
                key={app.app_id}
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <button
                  type="button"
                  onClick={() => toggle(app.app_id)}
                  className="flex items-center gap-3 w-full"
                  style={{
                    background: "transparent",
                    border: 0,
                    padding: "12px 22px",
                    cursor: "pointer",
                    color: "var(--text)",
                    textAlign: "left",
                  }}
                >
                  <span
                    aria-hidden
                    style={{ color: "var(--text-3)", fontSize: 11 }}
                  >
                    {isOpen ? "▼" : "▶"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>
                    {app.app_name}
                  </span>
                  {app.error ? (
                    <span className="pill-crit">{app.error}</span>
                  ) : (
                    <span
                      className="type-mono"
                      style={{ fontSize: 11, color: "var(--text-4)" }}
                    >
                      {app.tasks.length} task
                      {app.tasks.length === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
                {isOpen && !app.error && (
                  <div style={{ padding: "0 22px 14px 40px" }}>
                    {app.tasks.length === 0 ? (
                      <div
                        className="text-[12px]"
                        style={{ color: "var(--text-4)", padding: "4px 0" }}
                      >
                        No scheduled tasks.
                      </div>
                    ) : (
                      <table
                        className="data-table"
                        style={{ width: "100%" }}
                      >
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left" }}>Name</th>
                            <th style={{ textAlign: "left" }}>Schedule</th>
                            <th style={{ textAlign: "left" }}>Command</th>
                            <th style={{ textAlign: "left" }}>Container</th>
                          </tr>
                        </thead>
                        <tbody>
                          {app.tasks.map((t) => (
                            <tr key={t.uuid}>
                              <td style={{ fontSize: 12.5 }}>{t.name}</td>
                              <td
                                className="type-mono"
                                style={{ fontSize: 12 }}
                              >
                                {t.frequency}
                              </td>
                              <td
                                className="type-mono"
                                style={{
                                  fontSize: 11,
                                  color: "var(--text-3)",
                                  maxWidth: 320,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={t.command}
                              >
                                {t.command}
                              </td>
                              <td
                                className="type-mono"
                                style={{ fontSize: 11, color: "var(--text-4)" }}
                              >
                                {t.container ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
