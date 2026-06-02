"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh, IconDatabase, IconClock } from "@/components/ui/icons";
import type {
  DbColumn,
  DbMutationResult,
  DbQueryResult,
  DbSelectResult,
  DbSizes,
  DbTable,
} from "@/lib/provisioner/types";

type SchemaGroup = { schema: string; tables: DbTable[] };

function groupBySchema(tables: DbTable[]): SchemaGroup[] {
  const m = new Map<string, DbTable[]>();
  for (const t of tables) {
    if (!m.has(t.schema)) m.set(t.schema, []);
    m.get(t.schema)!.push(t);
  }
  return Array.from(m.entries())
    .map(([schema, ts]) => ({
      schema,
      tables: ts.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      if (a.schema === "public") return -1;
      if (b.schema === "public") return 1;
      return a.schema.localeCompare(b.schema);
    });
}

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

function isReadOnly(sql: string): boolean {
  const head = sql.trim().toUpperCase();
  return /^(SELECT|WITH|TABLE|VALUES|SHOW|EXPLAIN)\b/.test(head);
}

function dangerousVerb(sql: string): string | null {
  const head = sql.trim().toUpperCase();
  if (head.startsWith("DROP")) return "DROP";
  if (head.startsWith("TRUNCATE")) return "TRUNCATE";
  if (head.startsWith("ALTER")) return "ALTER";
  if (head.startsWith("DELETE") && !/\bWHERE\b/.test(head)) return "DELETE";
  return null;
}

function isSelectResult(r: DbQueryResult): r is DbSelectResult {
  return "rows" in r;
}

const RECENT_KEY = "wcn:db:recent";
const MAX_RECENT = 20;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

export default function DatabaseExplorer({ slug }: { slug: string }) {
  const [tables, setTables] = useState<DbTable[] | null>(null);
  const [sizes, setSizes] = useState<DbSizes | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    public: true,
  });
  const [tableCols, setTableCols] = useState<Record<string, DbColumn[]>>({});
  const [openTable, setOpenTable] = useState<string | null>(null);
  const [colsLoading, setColsLoading] = useState<string | null>(null);

  const [sql, setSql] = useState(
    "SELECT current_database() AS db, version();",
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DbQueryResult | null>(null);
  const [queryError, setQueryError] = useState<{
    message: string;
    duration?: number;
  } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const refreshSchema = useCallback(async () => {
    setLoadError(null);
    try {
      const [t, s] = await Promise.all([
        fetch(`/api/customers/${slug}/db/tables`, { cache: "no-store" }).then(
          async (r) => {
            if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
            return (await r.json()) as DbTable[];
          },
        ),
        fetch(`/api/customers/${slug}/db/sizes`, { cache: "no-store" }).then(
          async (r) => {
            if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
            return (await r.json()) as DbSizes;
          },
        ),
      ]);
      setTables(t);
      setSizes(s);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "load failed");
    }
  }, [slug]);

  useEffect(() => {
    refreshSchema();
  }, [refreshSchema]);

  const groups = useMemo(
    () => (tables ? groupBySchema(tables) : []),
    [tables],
  );

  const toggleSchema = (schema: string) =>
    setExpanded((e) => ({ ...e, [schema]: !e[schema] }));

  const handleTableClick = useCallback(
    async (t: DbTable) => {
      const key = `${t.schema}.${t.name}`;
      setOpenTable((cur) => (cur === key ? null : key));
      if (!tableCols[key]) {
        setColsLoading(key);
        try {
          const res = await fetch(
            `/api/customers/${slug}/db/columns?schema=${encodeURIComponent(
              t.schema,
            )}&table=${encodeURIComponent(t.name)}`,
            { cache: "no-store" },
          );
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            throw new Error(d.error || `HTTP ${res.status}`);
          }
          const cols = (await res.json()) as DbColumn[];
          setTableCols((c) => ({ ...c, [key]: cols }));
        } catch {
          // silent — UI will retry next time
        } finally {
          setColsLoading(null);
        }
      }
    },
    [slug, tableCols],
  );

  const insertSelect = (t: DbTable) => {
    const ident =
      t.schema === "public" ? t.name : `${t.schema}.${t.name}`;
    setSql(`SELECT * FROM ${ident} LIMIT 100;`);
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const runQuery = useCallback(async () => {
    if (!sql.trim() || running) return;
    const verb = dangerousVerb(sql);
    if (verb) {
      const typed = window.prompt(
        `This query starts with ${verb}. Type ${verb} to confirm.`,
      );
      if (typed !== verb) return;
    } else if (!isReadOnly(sql)) {
      if (!window.confirm("This statement mutates data. Run anyway?")) return;
    }
    setRunning(true);
    setQueryError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/customers/${slug}/db/query`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sql, max_rows: 1000 }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<
        DbQueryResult
      > & { error?: string; duration_ms?: number };
      if (!res.ok || data.error) {
        setQueryError({
          message: data.error || `HTTP ${res.status}`,
          duration: data.duration_ms,
        });
      } else {
        setResult(data as DbQueryResult);
        const next = [sql, ...recent.filter((q) => q !== sql)].slice(
          0,
          MAX_RECENT,
        );
        setRecent(next);
        saveRecent(next);
      }
    } catch (e) {
      setQueryError({
        message: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setRunning(false);
    }
  }, [sql, running, slug, recent]);

  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const t = e.currentTarget;
      const start = t.selectionStart;
      const end = t.selectionEnd;
      const next = sql.slice(0, start) + "  " + sql.slice(end);
      setSql(next);
      requestAnimationFrame(() => {
        t.selectionStart = t.selectionEnd = start + 2;
      });
    } else if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      e.preventDefault();
      const t = e.currentTarget;
      const start = t.selectionStart;
      const lineStart = sql.lastIndexOf("\n", start - 1) + 1;
      const before = sql.slice(0, lineStart);
      const after = sql.slice(lineStart);
      const next = after.startsWith("-- ")
        ? before + after.slice(3)
        : before + "-- " + after;
      setSql(next);
    }
  };

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "280px 1fr", minHeight: 540 }}
    >
      {/* === Left: schema tree === */}
      <Card>
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--line)" }}
        >
          <span className="type-eyebrow">§ SCHEMAS</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={refreshSchema}
            style={{ height: 22, padding: "0 6px" }}
            title="Refresh"
          >
            <IconRefresh />
          </button>
        </div>
        <div className="px-2 py-2" style={{ maxHeight: 460, overflowY: "auto" }}>
          {!tables && !loadError && (
            <p
              className="px-3 py-2 type-mono text-[11px]"
              style={{ color: "var(--text-4)" }}
            >
              Loading…
            </p>
          )}
          {loadError && (
            <p
              className="px-3 py-2 type-mono text-[11px]"
              style={{ color: "oklch(0.82 0.18 25)" }}
            >
              {loadError}
            </p>
          )}
          {groups.map((g) => {
            const open = !!expanded[g.schema];
            return (
              <div key={g.schema} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleSchema(g.schema)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-[6px] hover:bg-[var(--surface-2)] text-left"
                  style={{ fontSize: 12.5, color: "var(--text)" }}
                >
                  <span
                    style={{
                      color: "var(--text-3)",
                      width: 10,
                      display: "inline-block",
                    }}
                  >
                    {open ? "▾" : "▸"}
                  </span>
                  <span style={{ fontWeight: 500 }}>{g.schema}</span>
                  <span
                    className="ml-auto type-mono"
                    style={{ color: "var(--text-4)", fontSize: 10.5 }}
                  >
                    {g.tables.length}
                  </span>
                </button>
                {open && (
                  <ul className="ml-3 mt-1 space-y-px">
                    {g.tables.map((t) => {
                      const key = `${t.schema}.${t.name}`;
                      const opened = openTable === key;
                      const cols = tableCols[key];
                      return (
                        <li key={key}>
                          <div
                            className="flex items-center gap-2 px-2 py-1 rounded-[4px] hover:bg-[var(--surface-2)] cursor-pointer"
                            style={{ fontSize: 12 }}
                            onClick={() => handleTableClick(t)}
                            onDoubleClick={() => insertSelect(t)}
                            title="Click to expand · double-click to insert SELECT"
                          >
                            <span
                              style={{
                                color: "var(--text-4)",
                                width: 10,
                                display: "inline-block",
                              }}
                            >
                              {opened ? "▾" : "·"}
                            </span>
                            <span
                              style={{
                                color: "var(--text-2)",
                                flex: 1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {t.name}
                            </span>
                            <span
                              className="type-mono"
                              style={{
                                fontSize: 10,
                                color: "var(--text-4)",
                              }}
                            >
                              {fmtBytes(t.size_bytes)}
                            </span>
                          </div>
                          {opened && (
                            <div
                              className="ml-5 mt-1 mb-1 type-mono"
                              style={{ fontSize: 11, color: "var(--text-3)" }}
                            >
                              {colsLoading === key && <div>loading…</div>}
                              {cols &&
                                cols.map((c) => (
                                  <div
                                    key={c.name}
                                    className="flex gap-2 py-0.5"
                                  >
                                    <span style={{ color: "var(--text-2)" }}>
                                      {c.name}
                                    </span>
                                    <span style={{ color: "var(--text-4)" }}>
                                      {c.data_type}
                                      {c.is_nullable === "NO" ? " · not null" : ""}
                                    </span>
                                  </div>
                                ))}
                              <div className="mt-1">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => insertSelect(t)}
                                  style={{ height: 22 }}
                                >
                                  <IconDatabase />
                                  SELECT *
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        {sizes && (
          <div
            className="border-t px-4 py-3 space-y-2"
            style={{ borderColor: "var(--line)" }}
          >
            <div>
              <span className="type-eyebrow text-[10px] block">DB size</span>
              <span className="type-mono text-[14px]">
                {fmtBytes(sizes.db_size_bytes)}
              </span>
            </div>
            {sizes.tables.length > 0 && (
              <div>
                <span className="type-eyebrow text-[10px] block mb-1">
                  Top tables
                </span>
                <ul className="space-y-0.5 type-mono" style={{ fontSize: 11 }}>
                  {sizes.tables.slice(0, 5).map((t) => (
                    <li
                      key={`${t.schema}.${t.name}`}
                      className="flex justify-between gap-2"
                    >
                      <span
                        style={{
                          color: "var(--text-3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.schema === "public"
                          ? t.name
                          : `${t.schema}.${t.name}`}
                      </span>
                      <span style={{ color: "var(--text-4)" }}>
                        {fmtBytes(t.size_bytes)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* === Right: editor + results === */}
      <Card>
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-3"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-2">
            <span className="type-eyebrow">§ QUERY</span>
            {recent.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setRecentOpen((v) => !v)}
                  style={{ height: 22 }}
                >
                  <IconClock />
                  Recent ({recent.length}) {recentOpen ? "▴" : "▾"}
                </button>
                {recentOpen && (
                  <div
                    className="absolute left-0 top-full mt-1 z-10"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line-2)",
                      borderRadius: 6,
                      boxShadow: "var(--shadow-2)",
                      width: 420,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {recent.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSql(q);
                          setRecentOpen(false);
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-[var(--surface-2)] type-mono"
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-2)",
                          borderBottom: "1px solid var(--line)",
                          whiteSpace: "pre",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {q.length > 200 ? q.slice(0, 200) + "…" : q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="type-mono"
              style={{ fontSize: 11, color: "var(--text-4)" }}
            >
              <span className="kbd">⌘↵</span> run · <span className="kbd">⌘/</span> comment
            </span>
            <button
              type="button"
              className={`btn btn-sm ${dangerousVerb(sql) ? "btn-danger" : "btn-primary"}`}
              onClick={runQuery}
              disabled={running || !sql.trim()}
            >
              <IconDatabase />
              {running ? "Running…" : "Run"}
            </button>
          </div>
        </div>
        <textarea
          ref={editorRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={onEditorKey}
          spellCheck={false}
          className="w-full type-mono"
          style={{
            background: "var(--bg)",
            border: 0,
            color: "var(--text)",
            fontSize: 13,
            padding: "12px 16px",
            minHeight: 160,
            outline: "none",
            resize: "vertical",
            lineHeight: 1.55,
          }}
        />
        <div
          className="border-t px-4 py-2 flex items-center gap-3 flex-wrap"
          style={{
            borderColor: "var(--line)",
            background: "var(--bg-2)",
            fontSize: 11.5,
          }}
        >
          {queryError && (
            <span
              className="type-mono"
              style={{ color: "oklch(0.82 0.18 25)" }}
            >
              {queryError.message}
              {queryError.duration != null
                ? ` · ${queryError.duration} ms`
                : ""}
            </span>
          )}
          {result && (
            <>
              <span
                className="type-mono"
                style={{ color: "var(--text-2)" }}
              >
                {isSelectResult(result)
                  ? `${result.row_count} row${result.row_count === 1 ? "" : "s"}`
                  : `${(result as DbMutationResult).affected_rows} affected`}
              </span>
              <span
                className="type-mono"
                style={{ color: "var(--text-4)" }}
              >
                · {result.statement_type} · {result.duration_ms} ms
              </span>
              {isSelectResult(result) && result.truncated && (
                <span
                  className="type-mono"
                  style={{ color: "oklch(0.88 0.14 78)" }}
                >
                  ⚠ truncated to {result.row_count} rows
                </span>
              )}
            </>
          )}
          {!result && !queryError && (
            <span
              className="type-mono"
              style={{ color: "var(--text-4)" }}
            >
              ready
            </span>
          )}
        </div>
        <ResultsTable result={result} />
      </Card>
    </div>
  );
}

function ResultsTable({ result }: { result: DbQueryResult | null }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    setSortCol(null);
    setSortAsc(true);
  }, [result]);

  if (!result) {
    return (
      <div
        className="px-4 py-10 type-mono text-center"
        style={{ fontSize: 12, color: "var(--text-4)" }}
      >
        Run a query to see results.
      </div>
    );
  }

  if (!isSelectResult(result)) {
    return (
      <div className="px-4 py-6">
        <pre
          className="type-mono"
          style={{
            fontSize: 12,
            color: "var(--text-2)",
            background: "var(--bg)",
            padding: 12,
            border: "1px solid var(--line)",
            borderRadius: 6,
            overflowX: "auto",
          }}
        >
          {result.output || `${result.statement_type} ${result.affected_rows}`}
        </pre>
      </div>
    );
  }

  const rows = useMemo(() => {
    if (!sortCol) return result.rows;
    const copy = [...result.rows];
    copy.sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return sortAsc ? av - bv : bv - av;
      const as = String(av);
      const bs = String(bv);
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [result, sortCol, sortAsc]);

  const copyCell = (v: unknown) => {
    const text = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const renderCell = (v: unknown): string => {
    if (v == null) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  if (rows.length === 0) {
    return (
      <div
        className="px-4 py-10 type-mono text-center"
        style={{ fontSize: 12, color: "var(--text-4)" }}
      >
        Query returned 0 rows.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 480, overflow: "auto" }}>
      <table className="data-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            {result.columns.map((c) => {
              const active = sortCol === c;
              return (
                <th
                  key={c}
                  style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                  onClick={() => {
                    if (sortCol === c) setSortAsc((v) => !v);
                    else {
                      setSortCol(c);
                      setSortAsc(true);
                    }
                  }}
                >
                  {c}
                  {active && (
                    <span style={{ marginLeft: 4, color: "var(--brand)" }}>
                      {sortAsc ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {result.columns.map((c) => {
                const v = r[c];
                return (
                  <td
                    key={c}
                    onDoubleClick={() => copyCell(v)}
                    className="type-mono"
                    style={{
                      whiteSpace: "nowrap",
                      maxWidth: 360,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: v == null ? "var(--text-4)" : "var(--text)",
                    }}
                    title={typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                  >
                    {renderCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
