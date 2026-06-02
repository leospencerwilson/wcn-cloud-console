"use client";

import { useEffect, useMemo, useState } from "react";
import { IconDatabase } from "@/components/ui/icons";
import type { DbColumn, DbSizes, DbTable } from "@/lib/provisioner/types";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function keyOf(t: { schema: string; name: string }): string {
  return `${t.schema}.${t.name}`;
}

export default function SchemaBrowser({ slug }: { slug: string }) {
  const [tables, setTables] = useState<DbTable[] | null>(null);
  const [sizes, setSizes] = useState<DbSizes | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["public"]));
  const [openTable, setOpenTable] = useState<string | null>(null);
  const [cols, setCols] = useState<Record<string, DbColumn[]>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/customers/${slug}/db/tables`).then((r) => r.json()),
      fetch(`/api/customers/${slug}/db/sizes`).then((r) => r.json()),
    ])
      .then(([t, s]) => {
        if (!alive) return;
        if (Array.isArray(t)) setTables(t);
        else setErr((t as { error?: string }).error || "tables failed");
        setSizes(s as DbSizes);
      })
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "failed"));
    return () => {
      alive = false;
    };
  }, [slug]);

  const grouped = useMemo(() => {
    const out: Record<string, DbTable[]> = {};
    for (const t of tables ?? []) {
      (out[t.schema] ??= []).push(t);
    }
    return out;
  }, [tables]);

  const schemas = useMemo(() => {
    const ks = Object.keys(grouped);
    ks.sort((a, b) =>
      a === "public" ? -1 : b === "public" ? 1 : a.localeCompare(b),
    );
    return ks;
  }, [grouped]);

  function toggleSchema(s: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  async function loadCols(t: DbTable) {
    const k = keyOf(t);
    setOpenTable(openTable === k ? null : k);
    if (cols[k]) return;
    const res = await fetch(
      `/api/customers/${slug}/db/columns?schema=${encodeURIComponent(t.schema)}&table=${encodeURIComponent(t.name)}`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as DbColumn[];
    setCols((c) => ({ ...c, [k]: data }));
  }

  return (
    <section className="surface-card" style={{ padding: "18px 22px" }}>
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 12 }}
      >
        <div className="type-h3">Database</div>
        {sizes && (
          <span
            className="type-mono"
            style={{ fontSize: 12, color: "var(--text-3)" }}
          >
            Total {fmtBytes(sizes.db_size_bytes)}
          </span>
        )}
      </div>

      {err && (
        <div className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>
          {err}
        </div>
      )}

      {!tables && !err && (
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--text-3)" }}
        >
          Loading…
        </div>
      )}

      {tables && (
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          {schemas.map((s) => {
            const open = expanded.has(s);
            return (
              <div key={s} style={{ marginBottom: 6 }}>
                <button
                  type="button"
                  onClick={() => toggleSchema(s)}
                  className="flex items-center gap-2 w-full"
                  style={{
                    background: "transparent",
                    border: 0,
                    padding: "4px 0",
                    cursor: "pointer",
                    color: "var(--text)",
                    fontSize: 12.5,
                    textAlign: "left",
                  }}
                >
                  <span aria-hidden style={{ color: "var(--text-3)" }}>
                    {open ? "▼" : "▶"}
                  </span>
                  <span style={{ fontWeight: 500 }}>{s}</span>
                  <span
                    className="type-mono"
                    style={{ fontSize: 11, color: "var(--text-4)" }}
                  >
                    {grouped[s].length} tables
                  </span>
                </button>
                {open && (
                  <div style={{ paddingLeft: 18 }}>
                    {grouped[s].map((t) => {
                      const k = keyOf(t);
                      const expandedRow = openTable === k;
                      return (
                        <div key={k}>
                          <button
                            type="button"
                            onClick={() => loadCols(t)}
                            className="flex items-center gap-3 w-full"
                            style={{
                              background: "transparent",
                              border: 0,
                              padding: "4px 0",
                              cursor: "pointer",
                              color: "var(--text-2)",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ fontSize: 12 }}>•</span>
                            <span
                              className="type-mono"
                              style={{ fontSize: 12, flex: 1 }}
                            >
                              {t.name}
                            </span>
                            <span
                              className="type-mono"
                              style={{
                                fontSize: 11,
                                color: "var(--text-4)",
                              }}
                            >
                              {fmtBytes(t.size_bytes)}
                              {t.estimated_rows
                                ? ` · ${t.estimated_rows} rows`
                                : ""}
                            </span>
                          </button>
                          {expandedRow && cols[k] && (
                            <div
                              style={{
                                paddingLeft: 18,
                                paddingBottom: 6,
                                borderLeft:
                                  "1px solid var(--line)",
                                marginLeft: 4,
                              }}
                            >
                              {cols[k].map((c) => (
                                <div
                                  key={c.name}
                                  className="type-mono"
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-3)",
                                    padding: "2px 0",
                                  }}
                                >
                                  {c.name}{" "}
                                  <span style={{ color: "var(--text-4)" }}>
                                    {c.data_type}
                                    {c.is_nullable === "NO" ? " · not null" : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <a
          href="/dashboard/database"
          className="btn-ghost"
          style={{
            padding: "6px 12px",
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          <IconDatabase />
          Open SQL editor
        </a>
      </div>
    </section>
  );
}
