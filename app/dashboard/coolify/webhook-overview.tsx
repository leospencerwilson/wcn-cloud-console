"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CoolifyWebhookOverview } from "@/lib/provisioner/types";

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function WebhookOverview({ slug }: { slug: string }) {
  const [rows, setRows] = useState<CoolifyWebhookOverview[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/customers/${slug}/coolify/webhooks`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `${r.status}`);
        }
        return r.json();
      })
      .then((d: CoolifyWebhookOverview[]) => alive && setRows(d))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "failed"));
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <section className="surface-card" style={{ padding: 0 }}>
      <div
        className="flex items-baseline justify-between"
        style={{ padding: "16px 22px", borderBottom: "1px solid var(--line)" }}
      >
        <div className="type-h3">Push-to-deploy</div>
        <span
          className="type-mono"
          style={{ fontSize: 11, color: "var(--text-3)" }}
        >
          GitHub webhook per app
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
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--text-3)", padding: "12px 22px" }}
        >
          Loading…
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
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>App</th>
              <th style={{ textAlign: "left" }}>Branch</th>
              <th style={{ textAlign: "left" }}>Status</th>
              <th style={{ textAlign: "left" }}>Last delivery</th>
              <th style={{ textAlign: "right" }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cfg = row.webhook;
              return (
                <tr key={row.app_id}>
                  <td>
                    <Link
                      href={`/dashboard/apps/${row.app_id}`}
                      style={{ color: "var(--text)", textDecoration: "none" }}
                    >
                      {row.app_name}
                    </Link>
                  </td>
                  <td className="type-mono" style={{ fontSize: 12 }}>
                    {cfg.configured ? cfg.branch : "—"}
                  </td>
                  <td>
                    {cfg.configured ? (
                      <span className={cfg.enabled ? "pill-ok" : "pill-muted"}>
                        {cfg.enabled ? "enabled" : "disabled"}
                      </span>
                    ) : (
                      <span className="pill-muted">not setup</span>
                    )}
                  </td>
                  <td
                    className="type-mono"
                    style={{ fontSize: 12, color: "var(--text-3)" }}
                  >
                    {cfg.configured ? relTime(cfg.last_delivery_at) : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/dashboard/apps/${row.app_id}/deploy`}
                      className="type-mono"
                      style={{
                        fontSize: 12,
                        color: "var(--brand)",
                        textDecoration: "none",
                      }}
                    >
                      {cfg.configured ? "Manage →" : "Set up →"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
