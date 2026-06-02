"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh } from "@/components/ui/icons";
import type { RlsPolicy } from "@/lib/provisioner/supabase-client";

export default function PoliciesView({ slug }: { slug: string }) {
  const [policies, setPolicies] = useState<RlsPolicy[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

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
          {policies && (
            <span style={{ color: "var(--text-3)", marginLeft: 10 }}>
              {policies.length}
            </span>
          )}
        </span>
        <div className="flex items-center gap-3">
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
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--crit)" }}>{error}</div>
      ) : !filtered ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          {policies && policies.length === 0
            ? "(no RLS policies defined)"
            : "(no policies match the filter)"}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Schema.Table", "Policy", "Cmd", "Roles", "USING", "WITH CHECK"].map((h) => (
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
              {filtered.map((p) => (
                <tr key={`${p.schemaname}.${p.tablename}.${p.name}`} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td>
                    <span className="type-mono">
                      <span style={{ color: "var(--text-3)" }}>{p.schemaname}.</span>
                      <strong style={{ color: "var(--text)" }}>{p.tablename}</strong>
                    </span>
                  </Td>
                  <Td>
                    <span className="type-mono" style={{ color: "var(--brand)" }}>{p.name}</span>
                  </Td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
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
