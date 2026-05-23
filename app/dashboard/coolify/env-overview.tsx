"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CoolifyEnvOverview } from "@/lib/provisioner/types";

type Row = {
  app_id: string;
  app_name: string;
  key: string;
  type: "build-time" | "runtime" | "preview";
};

function classify(v: { is_build_time: boolean; is_preview: boolean }): Row["type"] {
  if (v.is_build_time) return "build-time";
  if (v.is_preview) return "preview";
  return "runtime";
}

export default function EnvOverview({ slug }: { slug: string }) {
  const [data, setData] = useState<CoolifyEnvOverview[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/customers/${slug}/coolify/env`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `${r.status}`);
        }
        return r.json();
      })
      .then((d: CoolifyEnvOverview[]) => alive && setData(d))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "failed"));
    return () => {
      alive = false;
    };
  }, [slug]);

  const flat = useMemo<Row[]>(() => {
    if (!data) return [];
    const out: Row[] = [];
    for (const app of data) {
      for (const v of app.env_vars) {
        out.push({
          app_id: app.app_id,
          app_name: app.app_name,
          key: v.key,
          type: classify(v),
        });
      }
    }
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    if (!q.trim()) return flat;
    const needle = q.toLowerCase();
    return flat.filter(
      (r) =>
        r.key.toLowerCase().includes(needle) ||
        r.app_name.toLowerCase().includes(needle),
    );
  }, [flat, q]);

  return (
    <section className="surface-card" style={{ padding: 0 }}>
      <div
        className="flex items-center gap-3 flex-wrap"
        style={{ padding: "16px 22px", borderBottom: "1px solid var(--line)" }}
      >
        <div className="type-h3">Environment variables</div>
        <span
          className="type-mono"
          style={{ fontSize: 11, color: "var(--text-3)" }}
        >
          keys only · values masked
        </span>
        <input
          className="field-input"
          placeholder="Filter keys or apps…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginLeft: "auto", maxWidth: 240, fontSize: 12 }}
        />
      </div>

      {err && (
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--crit)", padding: "12px 22px" }}
        >
          {err}
        </div>
      )}

      {!data && !err && (
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--text-3)", padding: "12px 22px" }}
        >
          Loading…
        </div>
      )}

      {data && filtered.length === 0 && (
        <div
          className="text-[13px]"
          style={{ color: "var(--text-3)", padding: "12px 22px" }}
        >
          {flat.length === 0 ? "No environment variables." : "No matches."}
        </div>
      )}

      {data && filtered.length > 0 && (
        <div style={{ maxHeight: 420, overflow: "auto" }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>App</th>
                <th style={{ textAlign: "left" }}>Key</th>
                <th style={{ textAlign: "left" }}>Type</th>
                <th style={{ textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={`${r.app_id}:${r.key}:${i}`}>
                  <td>{r.app_name}</td>
                  <td className="type-mono" style={{ fontSize: 12 }}>
                    {r.key}
                  </td>
                  <td>
                    <span className="pill-muted">{r.type}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/dashboard/apps/${r.app_id}/env`}
                      className="type-mono"
                      style={{
                        fontSize: 12,
                        color: "var(--brand)",
                        textDecoration: "none",
                      }}
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
