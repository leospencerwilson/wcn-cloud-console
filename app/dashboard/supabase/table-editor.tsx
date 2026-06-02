"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
  IconCheck,
  IconDatabase,
} from "@/components/ui/icons";
import type {
  AlterColumnInput,
  AlterTableInput,
  ColumnInfo,
  ColumnInput,
  CreateTableInput,
  ForeignKeyInput,
  TableInfo,
  TableRowsResp,
  TableSummary,
} from "@/lib/provisioner/supabase-client";

/* ── Constants ─────────────────────────────────────────────────────── */

const PAGE_SIZE = 50;

const TYPE_GROUPS: { label: string; types: string[] }[] = [
  {
    label: "Numeric",
    types: ["int2", "int4", "int8", "float4", "float8", "numeric", "money"],
  },
  {
    label: "Text",
    types: ["text", "varchar", "char", "citext"],
  },
  {
    label: "Date / time",
    types: ["timestamptz", "timestamp", "date", "time", "timetz", "interval"],
  },
  {
    label: "Boolean / UUID",
    types: ["bool", "uuid"],
  },
  {
    label: "JSON / binary",
    types: ["jsonb", "json", "bytea"],
  },
  {
    label: "Network",
    types: ["inet", "cidr", "macaddr"],
  },
];

const FK_ACTIONS = ["NO ACTION", "RESTRICT", "CASCADE", "SET NULL", "SET DEFAULT"] as const;

/* ── Helpers ───────────────────────────────────────────────────────── */

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function isJsonType(t: string): boolean {
  return t === "jsonb" || t === "json";
}

function isNumericType(t: string): boolean {
  return /^(int2|int4|int8|integer|bigint|smallint|float4|float8|real|double precision|numeric|decimal|money)/.test(t);
}

function isBoolType(t: string): boolean {
  return t === "bool" || t === "boolean";
}

function parseInput(raw: string, dataType: string): unknown {
  if (raw === "") return null;
  if (isBoolType(dataType)) return raw === "true";
  if (isNumericType(dataType)) {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error(`"${raw}" is not a valid ${dataType}`);
    return n;
  }
  if (isJsonType(dataType)) {
    try { return JSON.parse(raw); }
    catch { throw new Error(`invalid JSON for ${dataType}`); }
  }
  return raw;
}

function pkColumns(info: TableInfo): ColumnInfo[] {
  return info.columns.filter((c) => c.primary_key);
}

/* ── Main component ────────────────────────────────────────────────── */

export default function TableEditor({ slug }: { slug: string }) {
  const [tables, setTables] = useState<TableSummary[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [creatingTable, setCreatingTable] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reloadTables = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(`/api/customers/${slug}/db/tables`, { cache: "no-store" });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      const data = (await r.json()) as TableSummary[];
      setTables(data);
      if (selected && !data.some((t) => t.name === selected)) setSelected(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load tables");
    }
  }, [slug, selected]);

  useEffect(() => { reloadTables(); }, [reloadTables, refreshTick]);

  return (
    <Card>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          minHeight: 560,
          borderColor: "var(--color-hairline)",
        }}
      >
        {/* ── Sidebar ── */}
        <aside
          style={{
            borderRight: "1px solid var(--color-hairline)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: "12px 14px", borderBottom: "1px solid var(--color-hairline)" }}
          >
            <span className="type-eyebrow">§ TABLES</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setRefreshTick((n) => n + 1)}
                title="Refresh"
              >
                <IconRefresh />
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setCreatingTable(true)}
                title="New table"
              >
                <IconPlus />
                New
              </button>
            </div>
          </div>
          {err && (
            <div
              className="type-mono text-[11px]"
              style={{ color: "var(--crit)", padding: "8px 14px", borderBottom: "1px solid var(--line)" }}
            >
              {err}
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {!tables ? (
              <p
                className="type-mono text-[12px]"
                style={{ color: "var(--text-3)", padding: "12px 14px" }}
              >
                Loading…
              </p>
            ) : tables.length === 0 ? (
              <p
                className="type-mono text-[12px]"
                style={{ color: "var(--text-3)", padding: "12px 14px" }}
              >
                (no tables yet — create one)
              </p>
            ) : (
              tables.map((t) => {
                const active = t.name === selected;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setSelected(t.name)}
                    className="flex items-center gap-2 w-full"
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      border: 0,
                      borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                      padding: "8px 12px",
                      cursor: "pointer",
                      color: active ? "var(--text)" : "var(--text-2)",
                      textAlign: "left",
                    }}
                  >
                    <IconDatabase />
                    <span className="type-mono" style={{ flex: 1, fontSize: 12.5 }}>
                      {t.name}
                    </span>
                    <span
                      className="type-mono"
                      style={{ fontSize: 10.5, color: "var(--text-4)" }}
                    >
                      {fmtBytes(t.size_bytes)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main pane ── */}
        <main style={{ minWidth: 0 }}>
          {!selected ? (
            <EmptyState onCreate={() => setCreatingTable(true)} />
          ) : (
            <TableDetail
              key={selected}
              slug={slug}
              table={selected}
              onDropped={() => {
                setSelected(null);
                setRefreshTick((n) => n + 1);
              }}
              onRenamed={(newName) => {
                setSelected(newName);
                setRefreshTick((n) => n + 1);
              }}
              onChanged={() => setRefreshTick((n) => n + 1)}
            />
          )}
        </main>
      </div>

      {creatingTable && (
        <NewTableModal
          slug={slug}
          onClose={() => setCreatingTable(false)}
          onCreated={(name) => {
            setCreatingTable(false);
            setSelected(name);
            setRefreshTick((n) => n + 1);
          }}
        />
      )}
    </Card>
  );
}

/* ── Empty state ───────────────────────────────────────────────────── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: 64, minHeight: 560, color: "var(--text-3)" }}
    >
      <IconDatabase />
      <p className="type-h3" style={{ marginTop: 18 }}>No table selected</p>
      <p className="type-mono text-[12px]" style={{ marginTop: 6 }}>
        Pick one from the sidebar, or create a new table.
      </p>
      <button type="button" className="btn btn-primary" style={{ marginTop: 18 }} onClick={onCreate}>
        <IconPlus />
        New table
      </button>
    </div>
  );
}

/* ── Table detail (columns + rows) ─────────────────────────────────── */

function TableDetail({
  slug,
  table,
  onDropped,
  onRenamed,
  onChanged,
}: {
  slug: string;
  table: string;
  onDropped: () => void;
  onRenamed: (newName: string) => void;
  onChanged: () => void;
}) {
  const [info, setInfo] = useState<TableInfo | null>(null);
  const [rowsData, setRowsData] = useState<TableRowsResp | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [insertOpen, setInsertOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnInfo | null>(null);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [infoR, rowsR] = await Promise.all([
        fetch(`/api/customers/${slug}/db/tables/${encodeURIComponent(table)}/info`, { cache: "no-store" }),
        fetch(`/api/customers/${slug}/db/rows?table=${encodeURIComponent(table)}&limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" }),
      ]);
      if (!infoR.ok) throw new Error((await infoR.json()).error || "info failed");
      if (!rowsR.ok) throw new Error((await rowsR.json()).error || "rows failed");
      setInfo((await infoR.json()) as TableInfo);
      setRowsData((await rowsR.json()) as TableRowsResp);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [slug, table, offset, refreshTick]);

  useEffect(() => { reload(); }, [reload]);

  async function onDropTable() {
    if (!confirm(`Drop table "${table}"? This cannot be undone.`)) return;
    const r = await fetch(`/api/customers/${slug}/db/tables/${encodeURIComponent(table)}`, { method: "DELETE" });
    if (!r.ok) {
      setErr((await r.json().catch(() => ({}))).error || `drop failed (${r.status})`);
      return;
    }
    onDropped();
  }

  async function onDropColumn(c: ColumnInfo) {
    if (!confirm(`Drop column "${c.name}"? This cannot be undone.`)) return;
    const r = await fetch(`/api/customers/${slug}/db/tables/${encodeURIComponent(table)}/columns/${encodeURIComponent(c.name)}`, { method: "DELETE" });
    if (!r.ok) {
      setErr((await r.json().catch(() => ({}))).error || `drop column failed (${r.status})`);
      return;
    }
    setRefreshTick((n) => n + 1);
    onChanged();
  }

  async function onDeleteRow(row: Record<string, unknown>) {
    if (!info) return;
    const pks = pkColumns(info);
    if (pks.length === 0) {
      setErr("Cannot delete rows: this table has no primary key");
      return;
    }
    const pk = Object.fromEntries(pks.map((c) => [c.name, row[c.name]]));
    if (!confirm(`Delete row where ${pks.map((c) => `${c.name}=${pk[c.name]}`).join(", ")}?`)) return;
    const r = await fetch(`/api/customers/${slug}/db/tables/${encodeURIComponent(table)}/rows`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pk }),
    });
    if (!r.ok) {
      setErr((await r.json().catch(() => ({}))).error || `delete failed (${r.status})`);
      return;
    }
    setRefreshTick((n) => n + 1);
  }

  return (
    <>
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{ padding: "12px 18px", borderBottom: "1px solid var(--color-hairline)" }}
      >
        <div className="flex items-center gap-3">
          <span className="type-eyebrow">§ TABLE</span>
          <h3 className="type-mono" style={{ fontSize: 14, color: "var(--text)" }}>
            public.{table}
          </h3>
          {info?.rls_enabled && (
            <span className="pill-ok type-mono" style={{ fontSize: 10, padding: "1px 6px" }}>RLS</span>
          )}
        </div>
        <div className="vm-action-group" role="group" aria-label="Table actions">
          <button type="button" className="vm-action vm-action--start" onClick={() => setInsertOpen(true)}>
            <IconPlus />
            <span>Insert row</span>
          </button>
          <button type="button" className="vm-action" onClick={() => setAddColumnOpen(true)}>
            <IconPlus />
            <span>Add column</span>
          </button>
          <button type="button" className="vm-action" onClick={() => setRenameOpen(true)}>
            <span>Rename</span>
          </button>
          <button type="button" className="vm-action vm-action--end" onClick={onDropTable} style={{ color: "var(--crit)" }}>
            <IconTrash />
            <span>Drop</span>
          </button>
        </div>
      </div>

      {err && (
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--crit)", padding: "10px 18px", borderBottom: "1px solid var(--line)" }}
        >
          {err}
        </div>
      )}

      {/* Columns strip */}
      {info && (
        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid var(--color-hairline)",
            background: "var(--surface-1)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {info.columns.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setEditingColumn(c)}
              className="type-mono"
              title="Click to edit column"
              style={{
                background: "transparent",
                border: "1px solid var(--line)",
                borderRadius: 3,
                padding: "3px 8px",
                fontSize: 11.5,
                color: "var(--text-2)",
                cursor: "pointer",
              }}
            >
              {c.primary_key && <span style={{ color: "var(--accent)", marginRight: 4 }}>🔑</span>}
              {c.name}{" "}
              <span style={{ color: "var(--text-4)" }}>
                {c.udt_name}
                {c.nullable ? "" : " · not null"}
                {c.identity ? " · identity" : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Rows grid */}
      {loading ? (
        <div className="type-mono text-[12px]" style={{ color: "var(--text-3)", padding: 18 }}>Loading…</div>
      ) : !info || !rowsData ? null : (
        <div style={{ overflow: "auto", maxHeight: 480 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
              <tr>
                {info.columns.map((c) => (
                  <th key={c.name} style={thStyle}>
                    {c.primary_key && "🔑 "}
                    {c.name}
                    <span style={{ color: "var(--text-4)", fontWeight: 400, marginLeft: 4 }}>
                      {c.udt_name}
                    </span>
                  </th>
                ))}
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rowsData.rows.length === 0 ? (
                <tr>
                  <td colSpan={info.columns.length + 1} style={{ padding: 18, textAlign: "center", color: "var(--text-3)" }} className="type-mono text-[12px]">
                    (no rows — Insert row to add the first one)
                  </td>
                </tr>
              ) : (
                rowsData.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                    onClick={() => setEditingRow(row)}
                  >
                    {info.columns.map((c) => {
                      const v = row[c.name];
                      const isNull = v === null || v === undefined;
                      return (
                        <td key={c.name} style={tdStyle}>
                          {isNull ? (
                            <span style={{ color: "var(--text-4)", fontStyle: "italic" }}>NULL</span>
                          ) : (
                            <span
                              style={{
                                display: "inline-block",
                                maxWidth: 320,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                verticalAlign: "middle",
                              }}
                              title={renderValue(v)}
                            >
                              {renderValue(v)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td style={tdStyle}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRow(row);
                        }}
                        style={{ color: "var(--crit)" }}
                        title="Delete row"
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {rowsData && rowsData.total > PAGE_SIZE && (
        <div
          className="flex items-center justify-between"
          style={{ padding: "10px 18px", borderTop: "1px solid var(--color-hairline)" }}
        >
          <span className="type-mono text-[11px]" style={{ color: "var(--text-3)" }}>
            {Math.min(rowsData.total, offset + 1)}–{Math.min(rowsData.total, offset + rowsData.rows.length)} of {rowsData.total}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" disabled={loading || offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>← Prev</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={loading || offset + PAGE_SIZE >= rowsData.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next →</button>
          </div>
        </div>
      )}

      {insertOpen && info && (
        <RowModal
          mode="insert"
          slug={slug}
          table={table}
          info={info}
          existing={null}
          onClose={() => setInsertOpen(false)}
          onDone={() => { setInsertOpen(false); setRefreshTick((n) => n + 1); }}
        />
      )}

      {editingRow && info && (
        <RowModal
          mode="edit"
          slug={slug}
          table={table}
          info={info}
          existing={editingRow}
          onClose={() => setEditingRow(null)}
          onDone={() => { setEditingRow(null); setRefreshTick((n) => n + 1); }}
        />
      )}

      {addColumnOpen && (
        <ColumnModal
          mode="add"
          slug={slug}
          table={table}
          column={null}
          onClose={() => setAddColumnOpen(false)}
          onDone={() => { setAddColumnOpen(false); setRefreshTick((n) => n + 1); onChanged(); }}
        />
      )}

      {editingColumn && (
        <ColumnModal
          mode="edit"
          slug={slug}
          table={table}
          column={editingColumn}
          onClose={() => setEditingColumn(null)}
          onDone={() => { setEditingColumn(null); setRefreshTick((n) => n + 1); onChanged(); }}
          onDrop={() => { onDropColumn(editingColumn); setEditingColumn(null); }}
        />
      )}

      {renameOpen && (
        <RenameTableModal
          slug={slug}
          table={table}
          onClose={() => setRenameOpen(false)}
          onDone={(newName) => { setRenameOpen(false); onRenamed(newName); }}
        />
      )}
    </>
  );
}

/* ── Modals ────────────────────────────────────────────────────────── */

function NewTableModal({
  slug,
  onClose,
  onCreated,
}: {
  slug: string;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [columns, setColumns] = useState<ColumnDraft[]>([
    {
      name: "id",
      type: "int8",
      nullable: false,
      primary_key: true,
      identity: "by_default",
      unique: false,
      default: "",
      check: "",
      comment: "",
      fk: null,
    },
    {
      name: "created_at",
      type: "timestamptz",
      nullable: false,
      primary_key: false,
      identity: false,
      unique: false,
      default: "now()",
      check: "",
      comment: "",
      fk: null,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const body: CreateTableInput = {
        name,
        comment: comment || undefined,
        columns: columns.map(toColumnInput),
      };
      const r = await fetch(`/api/customers/${slug}/db/tables`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      onCreated(name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New table" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Name">
            <input required value={name} onChange={(e) => setName(e.target.value)} className="type-mono" style={inputStyle} placeholder="my_table" />
          </Field>
          <Field label="Comment (optional)">
            <input value={comment} onChange={(e) => setComment(e.target.value)} className="type-mono" style={inputStyle} placeholder="Describe this table" />
          </Field>
        </div>
        <div>
          <p className="type-eyebrow" style={{ color: "var(--text-3)", marginBottom: 6 }}>§ COLUMNS</p>
          <div className="space-y-2">
            {columns.map((c, i) => (
              <ColumnDraftRow
                key={i}
                draft={c}
                onChange={(next) => setColumns((cs) => cs.map((x, j) => (j === i ? next : x)))}
                onRemove={() => setColumns((cs) => cs.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setColumns((cs) => [...cs, blankDraft()])}
          >
            <IconPlus />
            Add column
          </button>
        </div>
        {err && <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <IconX />
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name || columns.length === 0}>
            <IconCheck />
            {saving ? "Creating…" : "Create table"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ColumnModal({
  mode,
  slug,
  table,
  column,
  onClose,
  onDone,
  onDrop,
}: {
  mode: "add" | "edit";
  slug: string;
  table: string;
  column: ColumnInfo | null;
  onClose: () => void;
  onDone: () => void;
  onDrop?: () => void;
}) {
  const [draft, setDraft] = useState<ColumnDraft>(() =>
    column
      ? {
          name: column.name,
          type: column.udt_name,
          nullable: column.nullable,
          primary_key: column.primary_key,
          unique: false,
          identity: column.identity ? "by_default" : false,
          default: column.default || "",
          check: "",
          comment: column.comment || "",
          fk: null,
        }
      : blankDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lockedFields = mode === "edit";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      if (mode === "add") {
        const body: ColumnInput = toColumnInput(draft);
        const r = await fetch(`/api/customers/${slug}/db/tables/${encodeURIComponent(table)}/columns`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      } else if (column) {
        const patch: AlterColumnInput = {};
        if (draft.name !== column.name) patch.new_name = draft.name;
        if (draft.type !== column.udt_name) patch.type = draft.type;
        if (draft.nullable !== column.nullable) patch.nullable = draft.nullable;
        if (draft.default !== (column.default || "")) {
          if (!draft.default) patch.drop_default = true;
          else patch.default = draft.default;
        }
        if (draft.comment !== (column.comment || "")) patch.comment = draft.comment;
        if (Object.keys(patch).length === 0) { onClose(); return; }
        const r = await fetch(
          `/api/customers/${slug}/db/tables/${encodeURIComponent(table)}/columns/${encodeURIComponent(column.name)}`,
          { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) },
        );
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={mode === "add" ? "Add column" : `Edit column: ${column?.name}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <ColumnDraftFields draft={draft} onChange={setDraft} disablePkFields={lockedFields} />
        {err && <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>{err}</p>}
        <div className="flex justify-between items-center pt-2">
          {mode === "edit" && onDrop && (
            <button type="button" className="btn btn-ghost" onClick={onDrop} style={{ color: "var(--crit)" }}>
              <IconTrash />
              Drop column
            </button>
          )}
          <div className="flex justify-end gap-3" style={{ marginLeft: "auto" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconX />
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !draft.name || !draft.type}>
              <IconCheck />
              {saving ? "Saving…" : mode === "add" ? "Add column" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function RowModal({
  mode,
  slug,
  table,
  info,
  existing,
  onClose,
  onDone,
}: {
  mode: "insert" | "edit";
  slug: string;
  table: string;
  info: TableInfo;
  existing: Record<string, unknown> | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const editableCols = useMemo(() => info.columns.filter((c) => !c.identity), [info.columns]);
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (mode === "edit" && existing) {
      return Object.fromEntries(
        editableCols.map((c) => [c.name, existing[c.name] == null ? "" : renderValue(existing[c.name])]),
      );
    }
    return Object.fromEntries(editableCols.map((c) => [c.name, ""]));
  });
  const [nulls, setNulls] = useState<Set<string>>(() => {
    if (mode === "edit" && existing) {
      return new Set(editableCols.filter((c) => existing[c.name] == null).map((c) => c.name));
    }
    return new Set();
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const c of editableCols) {
        if (nulls.has(c.name)) { payload[c.name] = null; continue; }
        const raw = values[c.name] ?? "";
        if (mode === "insert" && raw === "") continue; // omit so DEFAULT fires
        try { payload[c.name] = parseInput(raw, c.udt_name); }
        catch (e) { throw new Error(`${c.name}: ${e instanceof Error ? e.message : "invalid value"}`); }
      }
      const path = `/api/customers/${slug}/db/tables/${encodeURIComponent(table)}/rows`;
      let r: Response;
      if (mode === "insert") {
        r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ values: payload }) });
      } else if (existing) {
        const pks = pkColumns(info);
        if (pks.length === 0) throw new Error("Table has no primary key — cannot edit rows");
        const pk = Object.fromEntries(pks.map((c) => [c.name, existing[c.name]]));
        r = await fetch(path, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ pk, values: payload }) });
      } else { return; }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={mode === "insert" ? "Insert row" : "Edit row"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        {editableCols.map((c) => {
          const isNull = nulls.has(c.name);
          return (
            <div key={c.name} style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 10, alignItems: "center" }}>
              <label className="type-mono text-[12px]" style={{ color: "var(--text-2)" }}>
                {c.name}
                <span style={{ color: "var(--text-4)", marginLeft: 6 }}>{c.udt_name}</span>
                {!c.nullable && <span style={{ color: "var(--crit)", marginLeft: 4 }}>*</span>}
              </label>
              {isJsonType(c.udt_name) ? (
                <textarea
                  className="type-mono"
                  style={{ ...inputStyle, minHeight: 60, fontFamily: "monospace" }}
                  value={values[c.name] ?? ""}
                  disabled={isNull}
                  onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.value }))}
                  placeholder='{"key": "value"}'
                />
              ) : isBoolType(c.udt_name) ? (
                <select
                  className="type-mono"
                  style={inputStyle}
                  value={values[c.name] ?? ""}
                  disabled={isNull}
                  onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.value }))}
                >
                  <option value="">{mode === "insert" ? "(default)" : ""}</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input
                  className="type-mono"
                  style={inputStyle}
                  value={values[c.name] ?? ""}
                  disabled={isNull}
                  onChange={(e) => setValues((v) => ({ ...v, [c.name]: e.target.value }))}
                  placeholder={c.default ? `default: ${c.default}` : c.nullable ? "(nullable)" : ""}
                />
              )}
              {c.nullable && (
                <label className="type-mono text-[11px]" style={{ color: "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={isNull}
                    onChange={(e) => {
                      setNulls((s) => {
                        const next = new Set(s);
                        if (e.target.checked) next.add(c.name);
                        else next.delete(c.name);
                        return next;
                      });
                    }}
                  />
                  NULL
                </label>
              )}
            </div>
          );
        })}
        {err && <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <IconX />
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <IconCheck />
            {saving ? "Saving…" : mode === "insert" ? "Insert" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RenameTableModal({
  slug,
  table,
  onClose,
  onDone,
}: {
  slug: string;
  table: string;
  onClose: () => void;
  onDone: (newName: string) => void;
}) {
  const [name, setName] = useState(table);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const patch: AlterTableInput = { new_name: name };
      const r = await fetch(`/api/customers/${slug}/db/tables/${encodeURIComponent(table)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
      onDone(name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "rename failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Rename table" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className="type-mono" style={inputStyle} />
        </Field>
        {err && <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <IconX />
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name || name === table}>
            <IconCheck />
            {saving ? "Renaming…" : "Rename"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Column draft (used by NewTable + Column modals) ───────────────── */

type ColumnDraft = {
  name: string;
  type: string;
  nullable: boolean;
  primary_key: boolean;
  unique: boolean;
  identity: "always" | "by_default" | false;
  default: string;
  check: string;
  comment: string;
  fk: ForeignKeyInput | null;
};

function blankDraft(): ColumnDraft {
  return {
    name: "",
    type: "text",
    nullable: true,
    primary_key: false,
    unique: false,
    identity: false,
    default: "",
    check: "",
    comment: "",
    fk: null,
  };
}

function toColumnInput(d: ColumnDraft): ColumnInput {
  return {
    name: d.name,
    type: d.type,
    nullable: d.nullable,
    primary_key: d.primary_key || undefined,
    unique: d.unique || undefined,
    identity: d.identity || undefined,
    default: d.default || undefined,
    check: d.check || undefined,
    comment: d.comment || undefined,
    foreign_key: d.fk || undefined,
  };
}

function ColumnDraftRow({
  draft,
  onChange,
  onRemove,
}: {
  draft: ColumnDraft;
  onChange: (next: ColumnDraft) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 3, padding: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 60px 60px 60px 60px 32px", gap: 6, alignItems: "center" }}>
        <input
          required
          className="type-mono"
          style={inputStyle}
          placeholder="name"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
        <TypeSelect value={draft.type} onChange={(v) => onChange({ ...draft, type: v })} />
        <BoolChip label="PK" value={draft.primary_key} onChange={(v) => onChange({ ...draft, primary_key: v })} />
        <BoolChip label="NULL" value={draft.nullable} onChange={(v) => onChange({ ...draft, nullable: v })} />
        <BoolChip label="UNI" value={draft.unique} onChange={(v) => onChange({ ...draft, unique: v })} />
        <BoolChip label="ID" value={!!draft.identity} onChange={(v) => onChange({ ...draft, identity: v ? "by_default" : false })} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove} title="Remove">
          <IconX />
        </button>
      </div>
      <button
        type="button"
        className="type-mono text-[11px]"
        style={{ marginTop: 6, color: "var(--text-3)", background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "▼" : "▶"} More options
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Default (SQL expression)">
            <input
              className="type-mono"
              style={inputStyle}
              value={draft.default}
              onChange={(e) => onChange({ ...draft, default: e.target.value })}
              placeholder="e.g. now() or 'hello'"
            />
          </Field>
          <Field label="CHECK constraint">
            <input
              className="type-mono"
              style={inputStyle}
              value={draft.check}
              onChange={(e) => onChange({ ...draft, check: e.target.value })}
              placeholder="e.g. price > 0"
            />
          </Field>
          <Field label="Comment">
            <input
              className="type-mono"
              style={inputStyle}
              value={draft.comment}
              onChange={(e) => onChange({ ...draft, comment: e.target.value })}
            />
          </Field>
          <FkSubform value={draft.fk} onChange={(fk) => onChange({ ...draft, fk })} />
        </div>
      )}
    </div>
  );
}

function ColumnDraftFields({
  draft,
  onChange,
  disablePkFields,
}: {
  draft: ColumnDraft;
  onChange: (next: ColumnDraft) => void;
  disablePkFields?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <Field label="Name">
        <input required className="type-mono" style={inputStyle} value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
      </Field>
      <Field label="Type">
        <TypeSelect value={draft.type} onChange={(v) => onChange({ ...draft, type: v })} />
      </Field>
      <Field label="Default (SQL expression)">
        <input className="type-mono" style={inputStyle} value={draft.default} onChange={(e) => onChange({ ...draft, default: e.target.value })} placeholder="e.g. now() or 'hello'" />
      </Field>
      <Field label="Comment">
        <input className="type-mono" style={inputStyle} value={draft.comment} onChange={(e) => onChange({ ...draft, comment: e.target.value })} />
      </Field>
      <div style={{ display: "flex", gap: 14, gridColumn: "1 / -1", alignItems: "center" }}>
        <BoolChip label="Nullable" value={draft.nullable} onChange={(v) => onChange({ ...draft, nullable: v })} />
        {!disablePkFields && (
          <>
            <BoolChip label="Primary key" value={draft.primary_key} onChange={(v) => onChange({ ...draft, primary_key: v })} />
            <BoolChip label="Unique" value={draft.unique} onChange={(v) => onChange({ ...draft, unique: v })} />
            <BoolChip label="Identity" value={!!draft.identity} onChange={(v) => onChange({ ...draft, identity: v ? "by_default" : false })} />
          </>
        )}
      </div>
      {!disablePkFields && (
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="CHECK constraint">
            <input className="type-mono" style={inputStyle} value={draft.check} onChange={(e) => onChange({ ...draft, check: e.target.value })} placeholder="e.g. price > 0" />
          </Field>
          <FkSubform value={draft.fk} onChange={(fk) => onChange({ ...draft, fk })} />
        </div>
      )}
    </div>
  );
}

function FkSubform({ value, onChange }: { value: ForeignKeyInput | null; onChange: (v: ForeignKeyInput | null) => void }) {
  const on = !!value;
  const v: ForeignKeyInput = value || { ref_table: "", ref_column: "", on_delete: "NO ACTION", on_update: "NO ACTION" };
  return (
    <div style={{ border: "1px dashed var(--line)", padding: 8, borderRadius: 3, marginTop: 6 }}>
      <label className="type-mono text-[11px]" style={{ color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? v : null)} />
        Foreign key reference
      </label>
      {on && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
          <Field label="Ref table">
            <input className="type-mono" style={inputStyle} value={v.ref_table} onChange={(e) => onChange({ ...v, ref_table: e.target.value })} placeholder="other_table" />
          </Field>
          <Field label="Ref column">
            <input className="type-mono" style={inputStyle} value={v.ref_column} onChange={(e) => onChange({ ...v, ref_column: e.target.value })} placeholder="id" />
          </Field>
          <Field label="ON DELETE">
            <select className="type-mono" style={inputStyle} value={v.on_delete} onChange={(e) => onChange({ ...v, on_delete: e.target.value as ForeignKeyInput["on_delete"] })}>
              {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="ON UPDATE">
            <select className="type-mono" style={inputStyle} value={v.on_update} onChange={(e) => onChange({ ...v, on_update: e.target.value as ForeignKeyInput["on_update"] })}>
              {FK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="type-mono" style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      {TYPE_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function BoolChip({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="type-mono text-[11px]" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-2)" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "6px 9px",
  fontSize: 12.5,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 3,
  color: "var(--text)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 12,
  color: "var(--text)",
  fontFamily: "monospace",
  whiteSpace: "nowrap",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="type-eyebrow" style={{ color: "var(--text-3)", marginBottom: 4, fontSize: 10.5 }}>{label}</p>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"} mx-4`} onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="px-7 py-6 space-y-5">
            <p className="type-eyebrow">§ {title.toUpperCase()}</p>
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
}
