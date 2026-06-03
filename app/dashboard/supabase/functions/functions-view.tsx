"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconPlus, IconRefresh, IconTrash, IconX, IconCheck, IconEdit } from "@/components/ui/icons";

type Deployed = { name: string; size_bytes: number; mtime: string | null };

const DEFAULT_CODE = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  return new Response(
    JSON.stringify({ ok: true, path: url.pathname, ts: new Date().toISOString() }),
    { headers: { "content-type": "application/json" } },
  );
});
`;

const RESERVED = new Set(["main", "_shared"]);

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}

export default function FunctionsView({ slug }: { slug: string }) {
  const [items, setItems] = useState<Deployed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ name: string; code: string; mode: "new" | "edit" } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/customers/${slug}/supabase/functions/deployed`, { cache: "no-store" });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${r.status}`);
      } else {
        setItems((await r.json()) as Deployed[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { refresh(); }, [refresh]);

  async function openEdit(name: string) {
    setError(null);
    const r = await fetch(`/api/customers/${slug}/supabase/functions/${encodeURIComponent(name)}/source`, { cache: "no-store" });
    if (!r.ok) {
      const e = (await r.json().catch(() => ({}))) as { error?: string };
      setError(e.error || `Couldn't load source (${r.status})`);
      return;
    }
    const data = (await r.json()) as { name: string; code: string };
    setEditing({ name: data.name, code: data.code, mode: "edit" });
  }

  async function onDelete(name: string) {
    if (!confirm(`Delete function "${name}"? This cannot be undone.`)) return;
    setError(null);
    const r = await fetch(`/api/customers/${slug}/supabase/functions/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (!r.ok) {
      const e = (await r.json().catch(() => ({}))) as { error?: string };
      setError(e.error || `Delete failed (${r.status})`);
      return;
    }
    refresh();
  }

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § EDGE FUNCTIONS
          {items && <span style={{ color: "var(--text-3)", marginLeft: 10 }}>{items.length} deployed</span>}
        </span>
        <div className="vm-action-group" role="group" aria-label="Functions actions">
          <button type="button" className="vm-action vm-action--view" onClick={refresh} disabled={loading}>
            <IconRefresh />
            <span>{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
          <button
            type="button"
            className="vm-action vm-action--start"
            onClick={() => setEditing({ name: "", code: DEFAULT_CODE, mode: "new" })}
          >
            <IconPlus />
            <span>New function</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 type-mono text-[12px]" style={{ color: "var(--crit)", borderBottom: "1px solid var(--line)" }}>
          {error}
        </div>
      )}

      {!items ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          (no functions deployed — click New function)
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Size", "Last deployed", "Invoke URL", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-3)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((f) => {
                const reserved = RESERVED.has(f.name);
                return (
                  <tr key={f.name} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="type-mono" style={{ padding: "7px 12px", fontSize: 12.5 }}>
                      {f.name}
                      {reserved && (
                        <span className="pill-muted type-mono" style={{ marginLeft: 8, fontSize: 10, padding: "1px 5px" }}>
                          reserved
                        </span>
                      )}
                    </td>
                    <td className="type-mono" style={{ padding: "7px 12px", fontSize: 12, color: "var(--text-2)" }}>
                      {fmtBytes(f.size_bytes)}
                    </td>
                    <td className="type-mono" style={{ padding: "7px 12px", fontSize: 12, color: "var(--text-3)" }}>
                      {f.mtime ? new Date(f.mtime).toLocaleString() : "—"}
                    </td>
                    <td className="type-mono" style={{ padding: "7px 12px", fontSize: 11.5, color: "var(--text-3)" }}>
                      <code>/functions/v1/{f.name}</code>
                    </td>
                    <td style={{ padding: "5px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(f.name)}
                          title="Edit code"
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onDelete(f.name)}
                          disabled={reserved}
                          title={reserved ? "Reserved function — cannot delete" : "Delete"}
                          style={{ color: reserved ? "var(--text-4)" : "var(--crit)" }}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <FunctionEditor
          slug={slug}
          mode={editing.mode}
          initialName={editing.name}
          initialCode={editing.code}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </Card>
  );
}

function FunctionEditor({
  slug,
  mode,
  initialName,
  initialCode,
  onClose,
  onSaved,
}: {
  slug: string;
  mode: "new" | "edit";
  initialName: string;
  initialCode: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState(initialCode);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const r = await fetch(`/api/customers/${slug}/supabase/functions/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, code }),
      });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error || `Deploy failed (${r.status})`);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "deploy failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div className="w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <Card>
          <form onSubmit={submit} className="px-7 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="type-eyebrow">§ {mode === "new" ? "NEW FUNCTION" : `EDIT FUNCTION: ${initialName}`}</p>
            </div>
            <div>
              <p className="type-eyebrow" style={{ color: "var(--text-3)", marginBottom: 4, fontSize: 10.5 }}>NAME</p>
              <input
                required
                pattern="[a-z][a-z0-9_-]{0,63}"
                title="a-z, 0-9, _ , -. Must start with a letter."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={mode === "edit"}
                className="type-mono"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  fontSize: 13,
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 3,
                  color: "var(--text)",
                }}
                placeholder="my-function"
              />
            </div>
            <div>
              <p className="type-eyebrow" style={{ color: "var(--text-3)", marginBottom: 4, fontSize: 10.5 }}>CODE (index.ts)</p>
              <textarea
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="type-mono"
                style={{
                  width: "100%",
                  minHeight: 360,
                  padding: "10px 12px",
                  fontSize: 12.5,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  lineHeight: 1.55,
                  background: "var(--surface-1)",
                  border: "1px solid var(--line)",
                  borderRadius: 3,
                  color: "var(--text)",
                  resize: "vertical",
                }}
              />
              <p className="type-mono text-[11px]" style={{ color: "var(--text-4)", marginTop: 4 }}>
                Deno runtime. Invoke at <code>/functions/v1/{name || "<name>"}</code> on your project URL.
                Use <code>import {"{ serve }"} from "https://deno.land/std@0.168.0/http/server.ts"</code>.
              </p>
            </div>
            {err && <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>{err}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                <IconX />
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name || !code}>
                <IconCheck />
                {saving ? "Deploying…" : mode === "new" ? "Deploy" : "Save & redeploy"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
