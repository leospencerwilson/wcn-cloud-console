"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EnvVar } from "@/lib/provisioner/types";

type Row = EnvVar & { _id: number; _revealed: boolean };

let rowIdCounter = 0;
function makeRow(v?: Partial<EnvVar>): Row {
  return {
    _id: ++rowIdCounter,
    _revealed: false,
    key: v?.key ?? "",
    value: v?.value ?? "",
    is_build_time: v?.is_build_time ?? false,
    is_preview: v?.is_preview ?? false,
  };
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

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
    initial.length > 0 ? initial.map((v) => makeRow(v)) : [makeRow()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirty = useMemo(() => {
    if (rows.length !== initial.length) return true;
    const byKey = new Map(initial.map((v) => [v.key, v]));
    return rows.some((r) => {
      const o = byKey.get(r.key);
      return (
        !o ||
        o.value !== r.value ||
        o.is_build_time !== r.is_build_time ||
        o.is_preview !== r.is_preview
      );
    });
  }, [rows, initial]);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, makeRow()]);
  }

  function removeRow(id: number) {
    setRows((rs) => rs.filter((r) => r._id !== id));
  }

  function validate(): string | null {
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.key) continue;
      if (!KEY_RE.test(r.key)) return `Invalid key "${r.key}" — letters, digits, underscore; can't start with a digit.`;
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
      .map(({ _id, _revealed, ...rest }) => rest);

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
      setRows(fresh.length > 0 ? fresh.map((x) => makeRow(x)) : [makeRow()]);
      setSavedAt(new Date().toLocaleTimeString());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="type-eyebrow">§ ENVIRONMENT VARIABLES</h3>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "var(--color-muted)" }}
          >
            Saved values are pushed to Coolify on every save. A redeploy is
            required for changes to take effect.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !dirty && (
            <span
              className="type-mono text-[11px]"
              style={{ color: "var(--color-muted)" }}
            >
              Saved at {savedAt}
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || !dirty}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      )}

      <Card>
        <div className="px-2 py-2">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-4 py-3 type-eyebrow">Key</th>
                <th className="text-left px-4 py-3 type-eyebrow">Value</th>
                <th className="text-left px-4 py-3 type-eyebrow">Build</th>
                <th className="text-left px-4 py-3 type-eyebrow">Preview</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r._id}
                  className="border-t"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <td className="px-4 py-2 align-top w-[28%]">
                    <Input
                      value={r.key}
                      onChange={(e) => updateRow(r._id, { key: e.target.value })}
                      placeholder="DATABASE_URL"
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <Input
                        type={r._revealed ? "text" : "password"}
                        value={r.value}
                        onChange={(e) => updateRow(r._id, { value: e.target.value })}
                        placeholder="value"
                        autoComplete="off"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => updateRow(r._id, { _revealed: !r._revealed })}
                      >
                        {r._revealed ? "Hide" : "Show"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-2 align-top text-center">
                    <input
                      type="checkbox"
                      checked={r.is_build_time}
                      onChange={(e) =>
                        updateRow(r._id, { is_build_time: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-4 py-2 align-top text-center">
                    <input
                      type="checkbox"
                      checked={r.is_preview}
                      onChange={(e) =>
                        updateRow(r._id, { is_preview: e.target.checked })
                      }
                    />
                  </td>
                  <td className="px-4 py-2 align-top text-right">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeRow(r._id)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-4">
            <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>
              + Add variable
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
