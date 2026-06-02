"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconPlus, IconRefresh, IconTrash, IconX, IconCheck } from "@/components/ui/icons";
import type { RlsPolicy } from "@/lib/provisioner/supabase-client";

type Cmd = "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";

export default function PoliciesView({ slug }: { slug: string }) {
  const [policies, setPolicies] = useState<RlsPolicy[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/policies`, { cache: "no-store" });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${res.status}`);
      } else {
        setPolicies((await res.json()) as RlsPolicy[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { refresh(); }, [refresh]);

  async function onDelete(p: RlsPolicy) {
    if (!confirm(`Drop policy "${p.name}" on ${p.schemaname}.${p.tablename}?`)) return;
    setError(null);
    const res = await fetch(
      `/api/customers/${slug}/supabase/policies?table=${encodeURIComponent(p.tablename)}&name=${encodeURIComponent(p.name)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      setError(e.error || `Drop failed (${res.status})`);
    } else {
      refresh();
    }
  }

  const filtered = useMemo(() => {
    if (!policies) return null;
    if (!filter.trim()) return policies;
    const f = filter.toLowerCase();
    return policies.filter(
      (p) =>
        p.tablename.toLowerCase().includes(f) ||
        p.name.toLowerCase().includes(f) ||
        p.schemaname.toLowerCase().includes(f),
    );
  }, [policies, filter]);

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § RLS POLICIES
          {policies && <span style={{ color: "var(--text-3)", marginLeft: 10 }}>{policies.length}</span>}
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="type-mono"
            style={{
              fontSize: 11.5,
              padding: "4px 8px",
              border: "1px solid var(--line)",
              borderRadius: 2,
              background: "transparent",
              color: "var(--text)",
              width: 180,
            }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
            <IconRefresh />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <div className="vm-action-group" role="group" aria-label="New policy">
            <button
              type="button"
              className="vm-action vm-action--start"
              onClick={() => setCreating(true)}
              title="Create a new RLS policy"
            >
              <IconPlus />
              <span>New policy</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 type-mono text-[12px]" style={{ color: "var(--crit)", borderBottom: "1px solid var(--line)" }}>
          {error}
        </div>
      )}

      {!filtered ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          {policies && policies.length === 0 ? "(no RLS policies defined)" : "(no policies match the filter)"}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Schema.Table", "Policy", "Cmd", "Roles", "USING", "WITH CHECK", ""].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={`${p.schemaname}.${p.tablename}.${p.name}`} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td>
                    <span className="type-mono">
                      <span style={{ color: "var(--text-3)" }}>{p.schemaname}.</span>
                      <strong style={{ color: "var(--text)" }}>{p.tablename}</strong>
                    </span>
                  </Td>
                  <Td><span className="type-mono" style={{ color: "var(--brand)" }}>{p.name}</span></Td>
                  <Td muted>{p.cmd}</Td>
                  <Td muted>
                    {p.roles.length === 1 && p.roles[0] === "public" ? (
                      <span style={{ color: "var(--warn)" }}>public</span>
                    ) : (
                      p.roles.join(", ")
                    )}
                  </Td>
                  <TdCode>{p.qual ?? "—"}</TdCode>
                  <TdCode>{p.with_check ?? "—"}</TdCode>
                  <Td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onDelete(p)}
                      style={{ color: "var(--crit)" }}
                      title="Drop policy"
                    >
                      <IconTrash />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreatePolicyDialog
          slug={slug}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); refresh(); }}
        />
      )}
    </Card>
  );
}

function CreatePolicyDialog({
  slug,
  onClose,
  onCreated,
}: {
  slug: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [cmd, setCmd] = useState<Cmd>("SELECT");
  const [roles, setRoles] = useState("authenticated");
  const [usingExpr, setUsingExpr] = useState("");
  const [withCheck, setWithCheck] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/policies`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          table: table.trim(),
          name: name.trim(),
          cmd,
          roles: roles.split(",").map((r) => r.trim()).filter(Boolean),
          using: usingExpr.trim() || undefined,
          with_check: withCheck.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `Create failed (${res.status})`);
        return;
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New RLS policy" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
          <FormField label="Table (public schema)">
            <input value={table} onChange={(e) => setTable(e.target.value)} className="type-mono" style={inputStyle} placeholder="orders" required />
          </FormField>
        </div>
        <FormField label="Policy name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="type-mono" style={inputStyle} placeholder="orders_select_own" required />
        </FormField>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Command">
            <select value={cmd} onChange={(e) => setCmd(e.target.value as Cmd)} className="type-mono" style={inputStyle}>
              {(["SELECT", "INSERT", "UPDATE", "DELETE", "ALL"] as Cmd[]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Roles (comma-separated)">
            <input value={roles} onChange={(e) => setRoles(e.target.value)} className="type-mono" style={inputStyle} placeholder="authenticated" />
          </FormField>
        </div>
        {(cmd === "SELECT" || cmd === "UPDATE" || cmd === "DELETE" || cmd === "ALL") && (
          <FormField label="USING expression (filters rows visible / affected)">
            <textarea
              value={usingExpr}
              onChange={(e) => setUsingExpr(e.target.value)}
              className="type-mono"
              style={{ ...inputStyle, minHeight: 60, fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
              placeholder="auth.uid() = user_id"
            />
          </FormField>
        )}
        {(cmd === "INSERT" || cmd === "UPDATE" || cmd === "ALL") && (
          <FormField label="WITH CHECK expression (validates inserts/updates)">
            <textarea
              value={withCheck}
              onChange={(e) => setWithCheck(e.target.value)}
              className="type-mono"
              style={{ ...inputStyle, minHeight: 60, fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
              placeholder="auth.uid() = user_id"
            />
          </FormField>
        )}
        {error && (
          <p className="type-mono text-[12px]" style={{ color: "var(--crit)", whiteSpace: "pre-wrap" }}>{error}</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}><IconX />Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !table.trim() || !name.trim()}>
            <IconCheck />{saving ? "Creating…" : "Create policy"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "7px 10px",
  fontSize: 13,
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
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="type-eyebrow" style={{ color: "var(--text-3)", marginBottom: 6, fontSize: 10.5 }}>{label}</p>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div className="w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
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

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      style={{
        padding: "8px 12px",
        fontSize: 12,
        color: muted ? "var(--text-3)" : "var(--text)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
function TdCode({ children }: { children: React.ReactNode }) {
  return (
    <td
      className="type-mono"
      style={{
        padding: "8px 12px",
        fontSize: 11,
        color: "var(--text-2)",
        maxWidth: 320,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </td>
  );
}
