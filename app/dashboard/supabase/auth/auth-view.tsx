"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconPlus, IconRefresh, IconTrash, IconX, IconCheck } from "@/components/ui/icons";
import type { AuthUserRow, AuthUsersResp } from "@/lib/provisioner/supabase-client";

const PAGE_SIZE = 50;

export default function AuthView({ slug }: { slug: string }) {
  const [data, setData] = useState<AuthUsersResp | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/${slug}/supabase/auth/users?limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${res.status}`);
      } else {
        setData((await res.json()) as AuthUsersResp);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, offset]);

  useEffect(() => { refresh(); }, [refresh]);

  async function onDelete(id: string, email: string | null) {
    if (!confirm(`Delete user ${email ?? id}? This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/customers/${slug}/supabase/auth/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      setError(e.error || `Delete failed (${res.status})`);
    } else {
      refresh();
    }
  }

  async function onBan(id: string, banned: boolean) {
    setError(null);
    const res = await fetch(`/api/customers/${slug}/supabase/auth/users/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ban_duration: banned ? "none" : "permanent" }),
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      setError(e.error || `Update failed (${res.status})`);
    } else {
      refresh();
    }
  }

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § AUTH USERS
          {data && <span style={{ color: "var(--text-3)", marginLeft: 10 }}>{data.total} total</span>}
        </span>
        <div className="vm-action-group" role="group" aria-label="Auth actions">
          <button
            type="button"
            className="vm-action vm-action--view"
            onClick={refresh}
            disabled={loading}
          >
            <IconRefresh />
            <span>{loading ? "Refreshing…" : "Refresh"}</span>
          </button>
          <button
            type="button"
            className="vm-action vm-action--start"
            onClick={() => setCreating(true)}
            title="Create a new user"
          >
            <IconPlus />
            <span>Invite user</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          className="px-6 py-3 type-mono text-[12px]"
          style={{ color: "var(--crit)", borderBottom: "1px solid var(--line)" }}
        >
          {error}
        </div>
      )}

      {!data ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
      ) : data.users.length === 0 ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          (no users yet — Invite user to create the first one)
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Email", "Role", "Confirmed", "Created", "Last sign-in", ""].map((h) => (
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
              {data.users.map((u) => (
                <UserRow key={u.id} u={u} onDelete={() => onDelete(u.id, u.email)} onBan={() => onBan(u.id, u.banned)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div
          className="px-6 py-3 flex items-center justify-between gap-3 border-t"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-mono text-[11px]" style={{ color: "var(--text-3)" }}>
            {Math.min(data.total, offset + 1)} – {Math.min(data.total, offset + data.users.length)} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={loading || offset === 0}>← Prev</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={loading || offset + PAGE_SIZE >= data.total}>Next →</button>
          </div>
        </div>
      )}

      {creating && (
        <CreateUserDialog
          slug={slug}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); refresh(); }}
        />
      )}
    </Card>
  );
}

function UserRow({
  u,
  onDelete,
  onBan,
}: {
  u: AuthUserRow;
  onDelete: () => void;
  onBan: () => void;
}) {
  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <Td>
        <span style={{ color: "var(--text)" }}>{u.email ?? <em style={{ color: "var(--text-4)" }}>—</em>}</span>
        {u.banned && <BadgeCrit>Banned</BadgeCrit>}
      </Td>
      <Td>
        <span className="type-mono" style={{ fontSize: 11.5 }}>
          {u.role ?? "authenticated"}
        </span>
      </Td>
      <Td>
        {u.email_confirmed ? <BadgeOk>email</BadgeOk> : <BadgeMuted>unconfirmed</BadgeMuted>}
        {u.phone_confirmed && <BadgeOk>phone</BadgeOk>}
      </Td>
      <Td muted>{new Date(u.created_at).toLocaleString()}</Td>
      <Td muted>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}</Td>
      <Td>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onBan}
            title={u.banned ? "Unban this user" : "Ban this user (permanent)"}
          >
            {u.banned ? "Unban" : "Ban"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onDelete}
            style={{ color: "var(--crit)" }}
            title="Delete user"
          >
            <IconTrash />
          </button>
        </div>
      </Td>
    </tr>
  );
}

function CreateUserDialog({
  slug,
  onClose,
  onCreated,
}: {
  slug: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailConfirm, setEmailConfirm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/auth/users`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password || undefined,
          email_confirm: emailConfirm,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; msg?: string };
        setError(data.error || data.msg || `Create failed (${res.status})`);
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
    <Modal title="Invite user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="type-mono"
            style={inputStyle}
            placeholder="user@example.com"
          />
        </FormField>
        <FormField label="Password (optional — leave blank to require password reset)">
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="type-mono"
            style={inputStyle}
            placeholder="leave blank for invite-style flow"
          />
        </FormField>
        <label className="flex items-center gap-2 type-mono text-[12px]" style={{ color: "var(--text-2)" }}>
          <input type="checkbox" checked={emailConfirm} onChange={(e) => setEmailConfirm(e.target.checked)} />
          Mark email as confirmed (skip the verification flow)
        </label>
        {error && (
          <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <IconX />
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !email}>
            <IconCheck />
            {saving ? "Creating…" : "Create user"}
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="type-eyebrow" style={{ color: "var(--text-3)", marginBottom: 6, fontSize: 10.5 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
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
      className="type-mono"
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
function BadgeOk({ children }: { children: React.ReactNode }) {
  return <span className="pill-ok type-mono" style={{ fontSize: 10, padding: "1px 6px", marginRight: 4 }}>{children}</span>;
}
function BadgeCrit({ children }: { children: React.ReactNode }) {
  return <span className="pill-crit type-mono" style={{ fontSize: 10, padding: "1px 6px", marginLeft: 6 }}>{children}</span>;
}
function BadgeMuted({ children }: { children: React.ReactNode }) {
  return <span className="pill-muted type-mono" style={{ fontSize: 10, padding: "1px 6px" }}>{children}</span>;
}
