"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh } from "@/components/ui/icons";
import type { AuthUserRow, AuthUsersResp } from "@/lib/provisioner/supabase-client";

const PAGE_SIZE = 50;

export default function AuthView({ slug }: { slug: string }) {
  const [data, setData] = useState<AuthUsersResp | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § AUTH USERS
          {data && (
            <span style={{ color: "var(--text-3)", marginLeft: 10 }}>
              {data.total} total
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={refresh}
            disabled={loading}
          >
            <IconRefresh />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--crit)" }}>
          {error}
        </div>
      ) : !data ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          Loading…
        </div>
      ) : data.users.length === 0 ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          (no users yet)
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Email", "Phone", "Role", "Confirmed", "Created", "Last sign-in"].map((h) => (
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
                <UserRow key={u.id} u={u} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div
          className="px-6 py-3 flex items-center justify-between gap-3 border-t"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-mono text-[11px]" style={{ color: "var(--text-3)" }}>
            {Math.min(data.total, offset + 1)} – {Math.min(data.total, offset + data.users.length)} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={loading || offset === 0}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={loading || offset + PAGE_SIZE >= data.total}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function UserRow({ u }: { u: AuthUserRow }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <Td>
        <span style={{ color: "var(--text)" }}>{u.email ?? <em style={{ color: "var(--text-4)" }}>—</em>}</span>
        {u.banned && <BadgeCrit>Banned</BadgeCrit>}
      </Td>
      <Td muted>{u.phone ?? "—"}</Td>
      <Td>
        <span className="type-mono" style={{ fontSize: 11.5 }}>
          {u.role ?? "authenticated"}
        </span>
      </Td>
      <Td>
        {u.email_confirmed ? (
          <BadgeOk>email</BadgeOk>
        ) : (
          <BadgeMuted>unconfirmed</BadgeMuted>
        )}
        {u.phone_confirmed && <BadgeOk>phone</BadgeOk>}
      </Td>
      <Td muted>{new Date(u.created_at).toLocaleString()}</Td>
      <Td muted>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}</Td>
    </tr>
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
  return (
    <span
      className="pill-ok type-mono"
      style={{ fontSize: 10, padding: "1px 6px", marginRight: 4 }}
    >
      {children}
    </span>
  );
}
function BadgeCrit({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="pill-crit type-mono"
      style={{ fontSize: 10, padding: "1px 6px", marginLeft: 6 }}
    >
      {children}
    </span>
  );
}
function BadgeMuted({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="pill-muted type-mono"
      style={{ fontSize: 10, padding: "1px 6px" }}
    >
      {children}
    </span>
  );
}
