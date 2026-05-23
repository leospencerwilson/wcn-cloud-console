"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type {
  TeamInviteCreated,
  TeamMember,
  TeamRole,
} from "@/lib/provisioner/types";

const ROLES: TeamRole[] = ["owner", "admin", "developer", "viewer"];

function inviteLink(token: string): string {
  if (typeof window === "undefined") return `/team/accept?token=${token}`;
  return `${window.location.origin}/team/accept?token=${token}`;
}

function memberStatus(m: TeamMember): "active" | "pending" | "revoked" {
  if (m.revoked_at) return "revoked";
  if (m.accepted_at) return "active";
  return "pending";
}

function statusColor(s: "active" | "pending" | "revoked"): string {
  if (s === "active") return "var(--color-success, #2f6b3a)";
  if (s === "pending") return "var(--color-warning, #b07020)";
  return "var(--color-muted)";
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return iso;
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default function TeamManager({
  slug,
  currentEmail,
}: {
  slug: string;
  currentEmail: string;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [issued, setIssued] = useState<TeamInviteCreated | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/team`, { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setMembers((await res.json()) as TeamMember[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(m: TeamMember, role: TeamRole) {
    if (role === m.role) return;
    try {
      const res = await fetch(`/api/customers/${slug}/team/${m.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }

  async function revoke(m: TeamMember) {
    if (!confirm(`Revoke ${m.user_email}?`)) return;
    try {
      const res = await fetch(`/api/customers/${slug}/team/${m.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
  }

  return (
    <>
      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ TEAM MEMBERS</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setInviteOpen(true)}
            >
              Invite user
            </button>
          </div>
        </div>
        {error && (
          <p
            className="px-6 py-3 type-mono text-[12px]"
            style={{ color: "var(--color-danger, #b03020)" }}
          >
            {error}
          </p>
        )}
        {members.length === 0 && !loading ? (
          <p
            className="px-6 py-6 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No team members yet.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-muted)" }}>
                <th className="text-left px-6 py-2 type-eyebrow">Email</th>
                <th className="text-left px-6 py-2 type-eyebrow">Role</th>
                <th className="text-left px-6 py-2 type-eyebrow">Status</th>
                <th className="text-left px-6 py-2 type-eyebrow">Invited</th>
                <th className="text-right px-6 py-2 type-eyebrow">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const s = memberStatus(m);
                const isSelf = m.user_email === currentEmail;
                return (
                  <tr
                    key={m.id}
                    className="border-t"
                    style={{ borderColor: "var(--color-hairline)" }}
                  >
                    <td className="px-6 py-3 type-mono text-[12px]">
                      {m.user_email}
                      {isSelf && (
                        <span
                          className="ml-2 type-mono text-[10px]"
                          style={{ color: "var(--color-muted)" }}
                        >
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value as TeamRole)}
                        disabled={s === "revoked" || isSelf}
                        className="type-mono text-[12px] px-2 py-1"
                        style={{
                          background: "transparent",
                          border: "1px solid var(--color-hairline)",
                          borderRadius: 2,
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3 type-mono text-[12px]">
                      <span style={{ color: statusColor(s) }}>● {s}</span>
                    </td>
                    <td
                      className="px-6 py-3 type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {relTime(m.invited_at)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {s !== "revoked" && !isSelf && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => revoke(m)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {inviteOpen && (
        <InviteModal
          slug={slug}
          onClose={() => {
            setInviteOpen(false);
            setIssued(null);
            load();
          }}
          onIssued={(t) => setIssued(t)}
          issued={issued}
        />
      )}
    </>
  );
}

function InviteModal({
  slug,
  onClose,
  onIssued,
  issued,
}: {
  slug: string;
  onClose: () => void;
  onIssued: (t: TeamInviteCreated) => void;
  issued: TeamInviteCreated | null;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("viewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/team/invites`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      onIssued((await res.json()) as TeamInviteCreated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!issued) return;
    navigator.clipboard.writeText(inviteLink(issued.invite_token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg"
        style={{
          background: "var(--color-ivory, #f4f1ea)",
          border: "1px solid var(--color-hairline)",
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-3 border-b flex items-center justify-between"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">
            § {issued ? "INVITE CREATED" : "INVITE A TEAM MEMBER"}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="px-6 py-5">
          {issued ? (
            <div className="space-y-4">
              <p className="type-mono text-[12px]">
                Share this link with <strong>{issued.user_email}</strong>. Expires{" "}
                {new Date(issued.invite_expires_at).toLocaleString()}.
              </p>
              <div
                className="p-3 type-mono text-[11px]"
                style={{
                  background: "var(--color-success-bg, #e6f0e8)",
                  border: "1px solid var(--color-success, #2f6b3a)",
                  borderRadius: 2,
                  wordBreak: "break-all",
                }}
              >
                {inviteLink(issued.invite_token)}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={copyLink}
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block space-y-1">
                <span className="type-eyebrow text-[10px]">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  className="w-full type-mono text-[13px] px-3 py-2"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 2,
                  }}
                />
              </label>
              <fieldset className="space-y-2">
                <legend className="type-eyebrow text-[10px]">Role</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <label
                      key={r}
                      className="flex items-center gap-2 type-mono text-[13px]"
                    >
                      <input
                        type="radio"
                        name="role"
                        checked={role === r}
                        onChange={() => setRole(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p
                className="type-mono text-[11px]"
                style={{ color: "var(--color-muted)" }}
              >
                A magic link will be created. Share it with the invitee — the
                link expires in 7 days.
              </p>
              {error && (
                <p
                  className="type-mono text-[12px]"
                  style={{ color: "var(--color-danger, #b03020)" }}
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={busy || !email}
                >
                  {busy ? "Creating…" : "Create invite"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
