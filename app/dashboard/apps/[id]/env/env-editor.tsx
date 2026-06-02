"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconUpload,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconRefresh,
  IconSave,
  IconX,
} from "@/components/ui/icons";
import type { EnvVar } from "@/lib/provisioner/types";

type Kind = "runtime" | "build" | "preview";

type Row = {
  _id: number;
  key: string;
  value: string;
  kind: Kind;
  _revealed: boolean;
  _revealUntil: number | null;
  _isNew: boolean;
};

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const REVEAL_MS = 30_000;

let rowIdCounter = 0;

function envToKind(v: EnvVar): Kind {
  if (v.is_preview) return "preview";
  if (v.is_build_time) return "build";
  return "runtime";
}

function kindToEnv(kind: Kind): {
  is_build_time: boolean;
  is_preview: boolean;
} {
  if (kind === "preview") return { is_build_time: false, is_preview: true };
  if (kind === "build") return { is_build_time: true, is_preview: false };
  return { is_build_time: false, is_preview: false };
}

function makeRow(v?: Partial<EnvVar>, isNew = false): Row {
  const kind = v ? envToKind({ ...(v as EnvVar) }) : "runtime";
  return {
    _id: ++rowIdCounter,
    key: v?.key ?? "",
    value: v?.value ?? "",
    kind,
    _revealed: false,
    _revealUntil: null,
    _isNew: isNew,
  };
}

function exportToEnv(rows: { key: string; value: string }[]): string {
  return rows
    .filter((r) => r.key.trim().length > 0)
    .map((r) => {
      const needsQuote = /[\s#"'$`\\]/.test(r.value) || r.value === "";
      const v = needsQuote
        ? `"${r.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
        : r.value;
      return `${r.key}=${v}`;
    })
    .join("\n");
}

const KIND_OPTIONS: { value: Kind; label: string; hint: string }[] = [
  {
    value: "runtime",
    label: "runtime",
    hint: "Available to the running container",
  },
  {
    value: "build",
    label: "build-time",
    hint: "Set during build only — useful for NEXT_PUBLIC_* vars baked into the bundle",
  },
  {
    value: "preview",
    label: "preview",
    hint: "Used only in preview deployments, not production",
  },
];

export default function EnvEditor({
  slug,
  appId,
  initial,
}: {
  slug: string;
  appId: string;
  initial: EnvVar[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length > 0 ? initial.map((v) => makeRow(v)) : [],
  );
  const [baseline, setBaseline] = useState<EnvVar[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [, setTick] = useState(0);

  // Tick once per second to drive reveal countdown re-render.
  useEffect(() => {
    if (!rows.some((r) => r._revealUntil != null)) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [rows]);

  // Auto-mask after REVEAL_MS.
  useEffect(() => {
    const now = Date.now();
    const due = rows.filter(
      (r) => r._revealed && r._revealUntil != null && r._revealUntil <= now,
    );
    if (due.length === 0) return;
    setRows((rs) =>
      rs.map((r) =>
        due.find((d) => d._id === r._id)
          ? { ...r, _revealed: false, _revealUntil: null }
          : r,
      ),
    );
  });

  const counts = useMemo(() => {
    const byKey = new Map(baseline.map((v) => [v.key, v]));
    const seen = new Set<string>();
    let edited = 0;
    let added = 0;
    let removed = 0;
    for (const r of rows) {
      if (!r.key) continue;
      seen.add(r.key);
      const o = byKey.get(r.key);
      if (!o) {
        added += 1;
      } else {
        const k = envToKind(o);
        if (o.value !== r.value || k !== r.kind) edited += 1;
      }
    }
    for (const o of baseline) if (!seen.has(o.key)) removed += 1;
    return { edited, added, removed, dirty: edited + added + removed };
  }, [rows, baseline]);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  function toggleReveal(id: number) {
    setRows((rs) =>
      rs.map((r) =>
        r._id === id
          ? r._revealed
            ? { ...r, _revealed: false, _revealUntil: null }
            : { ...r, _revealed: true, _revealUntil: Date.now() + REVEAL_MS }
          : r,
      ),
    );
  }

  function addRow() {
    setRows((rs) => [makeRow(undefined, true), ...rs]);
  }

  function removeRow(id: number) {
    setRows((rs) => rs.filter((r) => r._id !== id));
  }

  function discard() {
    setRows(
      baseline.length > 0 ? baseline.map((v) => makeRow(v)) : [],
    );
    setError(null);
  }

  function validate(): string | null {
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.key.trim()) return "Empty key — remove the row or fill it in.";
      if (!KEY_RE.test(r.key))
        return `Invalid key "${r.key}" — letters, digits, underscore; can't start with a digit.`;
      if (seen.has(r.key)) return `Duplicate key "${r.key}".`;
      seen.add(r.key);
    }
    return null;
  }

  async function onSave() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);
    const payload: EnvVar[] = rows
      .filter((r) => r.key.trim().length > 0)
      .map((r) => {
        const flags = kindToEnv(r.kind);
        return { key: r.key, value: r.value, ...flags };
      });

    try {
      const res = await fetch(`/api/customers/${slug}/apps/${appId}/env`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      const fresh = (await res.json()) as EnvVar[];
      setBaseline(fresh);
      setRows(fresh.length > 0 ? fresh.map((x) => makeRow(x)) : []);
      setSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  function onExport() {
    const text =
      exportToEnv(rows.map((r) => ({ key: r.key, value: r.value }))) + "\n";
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appId}.env`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onImported(fresh: EnvVar[]) {
    setBaseline(fresh);
    setRows(fresh.length > 0 ? fresh.map((x) => makeRow(x)) : []);
    setImportOpen(false);
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="type-h3">Environment variables</h3>
          <p
            className="type-mono"
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              marginTop: 6,
            }}
          >
            Saved values are pushed to Coolify on every save. A redeploy is
            required for changes to take effect.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={addRow}
          >
            <IconPlus />
            Add
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setImportOpen(true)}
          >
            <IconUpload />
            Import .env
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onExport}
            disabled={rows.length === 0}
          >
            <IconDownload />
            Export .env
          </button>
        </div>
      </div>

      <section
        className="surface-card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        {rows.length === 0 ? (
          <div
            style={{
              padding: "40px 22px",
              textAlign: "center",
              color: "var(--text-3)",
            }}
          >
            <p
              className="type-mono"
              style={{ fontSize: 13, marginBottom: 14 }}
            >
              No environment variables yet.
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={addRow}
            >
              <IconPlus />
              Add first variable
            </button>
          </div>
        ) : (
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr
                className="type-mono"
                style={{
                  color: "var(--text-4)",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <th
                  className="text-left"
                  style={{ padding: "12px 16px", width: "28%" }}
                >
                  Key
                </th>
                <th
                  className="text-left"
                  style={{ padding: "12px 16px" }}
                >
                  Value
                </th>
                <th
                  className="text-left"
                  style={{ padding: "12px 16px", width: 220 }}
                >
                  Type
                </th>
                <th style={{ padding: "12px 16px", width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <EnvRow
                  key={r._id}
                  row={r}
                  onChange={(p) => updateRow(r._id, p)}
                  onToggleReveal={() => toggleReveal(r._id)}
                  onRemove={() => removeRow(r._id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {error && (
        <p
          className="type-mono"
          style={{ fontSize: 12, color: "var(--crit)" }}
        >
          {error}
        </p>
      )}
      {savedAt && counts.dirty === 0 && !error && (
        <p
          className="type-mono"
          style={{ fontSize: 11, color: "var(--text-3)" }}
        >
          Saved at {savedAt}.
        </p>
      )}

      {counts.dirty > 0 && (
        <div
          className="dirty-banner"
          role="status"
          aria-live="polite"
        >
          <div className="dirty-banner-msg">
            <span
              aria-hidden
              className="dirty-banner-dot"
            />
            <span className="type-mono" style={{ fontSize: 12.5 }}>
              Unsaved changes —{" "}
              {[
                counts.edited && `${counts.edited} edited`,
                counts.added && `${counts.added} added`,
                counts.removed && `${counts.removed} removed`,
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={discard}
              disabled={saving}
            >
              <IconRefresh />
              Discard
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onSave}
              disabled={saving}
            >
              <IconSave />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}

      {importOpen && (
        <ImportDialog
          slug={slug}
          appId={appId}
          onClose={() => setImportOpen(false)}
          onImported={onImported}
        />
      )}
    </div>
  );
}

function EnvRow({
  row,
  onChange,
  onToggleReveal,
  onRemove,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onToggleReveal: () => void;
  onRemove: () => void;
}) {
  const remaining =
    row._revealed && row._revealUntil
      ? Math.max(0, Math.ceil((row._revealUntil - Date.now()) / 1000))
      : 0;

  return (
    <tr
      style={{
        borderTop: "1px solid var(--line)",
      }}
    >
      <td style={{ padding: "10px 16px", verticalAlign: "top" }}>
        <input
          className="field-input"
          value={row.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="DATABASE_URL"
          autoComplete="off"
          spellCheck={false}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
          }}
        />
      </td>
      <td style={{ padding: "10px 16px", verticalAlign: "top" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="field-input"
            type={row._revealed ? "text" : "password"}
            value={row.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="value"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
            }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onToggleReveal}
            title={row._revealed ? "Hide" : "Reveal for 30s"}
          >
            {row._revealed ? <IconEyeOff /> : <IconEye />}
            {row._revealed ? `Hide · ${remaining}s` : "Show"}
          </button>
        </div>
      </td>
      <td style={{ padding: "10px 16px", verticalAlign: "top" }}>
        <div className="ios-segment" style={{ padding: 2 }}>
          {KIND_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              title={opt.hint}
              className={`ios-segment-item${row.kind === opt.value ? " is-active" : ""}`}
              onClick={() => onChange({ kind: opt.value })}
              style={{ padding: "5px 8px", fontSize: 11 }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </td>
      <td
        style={{
          padding: "10px 16px",
          verticalAlign: "top",
          textAlign: "right",
        }}
      >
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onRemove}
          title="Remove"
          aria-label="Remove"
        >
          <IconTrash />
        </button>
      </td>
    </tr>
  );
}

function ImportDialog({
  slug,
  appId,
  onClose,
  onImported,
}: {
  slug: string;
  appId: string;
  onClose: () => void;
  onImported: (fresh: EnvVar[]) => void;
}) {
  const [text, setText] = useState("");
  const [isBuild, setIsBuild] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [ignoreErrors, setIgnoreErrors] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  async function submit() {
    setErr(null);
    if (!text.trim()) {
      setErr("Paste some .env text first.");
      return;
    }
    if (!confirmReplace) {
      setErr("Tick the confirmation — import replaces ALL existing env vars.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/customers/${slug}/apps/${appId}/env/import`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text,
            is_build_time: isBuild,
            is_preview: isPreview,
            ignore_errors: ignoreErrors,
          }),
        },
      );
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error || `Import failed (${res.status})`);
        return;
      }
      // Refetch full list since /import doesn't return it.
      const list = await fetch(
        `/api/customers/${slug}/apps/${appId}/env`,
        { cache: "no-store" },
      );
      const fresh = (await list.json()) as EnvVar[];
      onImported(fresh);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(640px, calc(100vw - 32px))" }}
      >
        <div className="modal-header">
          <span
            className="type-mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-4)",
            }}
          >
            § Import .env
          </span>
        </div>
        <div className="modal-body" style={{ display: "grid", gap: 14 }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              lineHeight: 1.5,
            }}
          >
            Paste a <code>.env</code> file below. Importing replaces{" "}
            <strong style={{ color: "var(--warn)" }}>ALL</strong> existing env
            vars — copy your current set first if you need to merge.
          </p>
          <textarea
            ref={taRef}
            className="field-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`DATABASE_URL=postgresql://...\nSTRIPE_KEY=sk_live_...\n# comments and blank lines are ignored\nDEBUG="true"`}
            spellCheck={false}
            style={{
              minHeight: 180,
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              resize: "vertical",
            }}
          />
          <div
            className="type-mono"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px 22px",
              fontSize: 12,
              color: "var(--text-3)",
            }}
          >
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={isBuild}
                onChange={(e) => {
                  setIsBuild(e.target.checked);
                  if (e.target.checked) setIsPreview(false);
                }}
              />
              Build-time
            </label>
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={isPreview}
                onChange={(e) => {
                  setIsPreview(e.target.checked);
                  if (e.target.checked) setIsBuild(false);
                }}
              />
              Preview-only
            </label>
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <input
                type="checkbox"
                checked={ignoreErrors}
                onChange={(e) => setIgnoreErrors(e.target.checked)}
              />
              Skip bad lines (don&apos;t fail on parse errors)
            </label>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid color-mix(in oklch, var(--warn) 50%, var(--line))",
              borderRadius: 8,
              background:
                "color-mix(in oklch, var(--warn) 8%, transparent)",
            }}
          >
            <input
              type="checkbox"
              checked={confirmReplace}
              onChange={(e) => setConfirmReplace(e.target.checked)}
            />
            <span style={{ fontSize: 12.5, color: "var(--text)" }}>
              I understand this will replace ALL existing env vars.
            </span>
          </label>
          {err && (
            <p
              className="type-mono"
              style={{ fontSize: 12, color: "var(--crit)" }}
            >
              {err}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            <IconX />
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={busy}
          >
            <IconUpload />
            {busy ? "Importing…" : "Import and replace"}
          </button>
        </div>
      </div>
    </div>
  );
}
