"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconPlay, IconRefresh } from "@/components/ui/icons";

type Row = Record<string, unknown>;
type QueryResult = {
  columns: { name: string; type: string }[];
  rows: Row[];
  row_count: number;
  truncated: boolean;
  duration_ms: number;
};

const PLACEHOLDER = `-- Try:
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1, 2
LIMIT 50;`;

export default function SqlEditor({ slug }: { slug: string }) {
  const [sql, setSql] = useState<string>("");
  const [maxRows, setMaxRows] = useState<number>(500);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!sql.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/db/query`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sql, max_rows: maxRows }),
      });
      const data = (await res.json()) as
        | QueryResult
        | { error?: string; code?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error || `HTTP ${res.status}`);
        setResult(null);
      } else {
        setResult(data as QueryResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setResult(null);
    } finally {
      setRunning(false);
    }
  }, [slug, sql, maxRows]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + Enter to run — same shortcut Supabase Studio uses.
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ SQL EDITOR</span>
          <div className="flex items-center gap-3 flex-wrap">
            <label
              className="type-mono text-[11px] flex items-center gap-2"
              style={{ color: "var(--text-3)" }}
            >
              max rows
              <select
                value={maxRows}
                onChange={(e) => setMaxRows(Number(e.target.value))}
                className="type-mono text-[11px] px-2 py-1"
                style={{
                  background: "transparent",
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                  color: "var(--text)",
                }}
              >
                {[100, 500, 1000, 5000].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="vm-action-group" role="group" aria-label="Run">
              <button
                type="button"
                className="vm-action vm-action--start"
                disabled={running || !sql.trim()}
                onClick={run}
                title="Run query (Ctrl/Cmd + Enter)"
              >
                <IconPlay />
                <span>{running ? "Running…" : "Run"}</span>
              </button>
            </div>
          </div>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          className="type-mono"
          style={{
            display: "block",
            width: "100%",
            minHeight: 220,
            padding: "16px 22px",
            border: "none",
            outline: "none",
            resize: "vertical",
            background: "color-mix(in oklch, var(--text-4) 4%, var(--surface))",
            color: "var(--text)",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        />
      </Card>

      {error && (
        <Card>
          <div className="px-6 py-4">
            <p className="type-eyebrow" style={{ color: "var(--crit)", marginBottom: 8 }}>
              § QUERY ERROR
            </p>
            <p className="type-mono text-[12.5px]" style={{ color: "var(--crit)" }}>
              {error}
            </p>
          </div>
        </Card>
      )}

      {result && <ResultTable result={result} />}
    </div>
  );
}

function ResultTable({ result }: { result: QueryResult }) {
  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § RESULT · {result.row_count} row{result.row_count === 1 ? "" : "s"}
          {result.truncated && " (truncated)"}
        </span>
        <span className="type-mono text-[11px]" style={{ color: "var(--text-3)" }}>
          {result.duration_ms} ms
        </span>
      </div>
      {result.rows.length === 0 ? (
        <div
          className="px-6 py-6 type-mono text-[12px]"
          style={{ color: "var(--text-3)" }}
        >
          (no rows)
        </div>
      ) : (
        <div style={{ overflowX: "auto", maxHeight: 480 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {result.columns.map((c) => (
                  <th
                    key={c.name}
                    className="type-mono"
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-3)",
                      borderBottom: "1px solid var(--line)",
                      position: "sticky",
                      top: 0,
                      background: "var(--surface)",
                    }}
                    title={c.type}
                  >
                    {c.name}{" "}
                    <span style={{ color: "var(--text-4)", fontSize: 9 }}>
                      {c.type}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid var(--line)" }}>
                  {result.columns.map((c) => (
                    <td
                      key={c.name}
                      className="type-mono"
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        maxWidth: 360,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {renderCell(row[c.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function renderCell(v: unknown): string {
  if (v == null) return "NULL";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
