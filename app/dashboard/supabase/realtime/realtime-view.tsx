"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh } from "@/components/ui/icons";
import type { RealtimeOverview } from "@/lib/provisioner/supabase-client";

export default function RealtimeView({ slug }: { slug: string }) {
  const [data, setData] = useState<RealtimeOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/realtime`, { cache: "no-store" });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${res.status}`);
      } else {
        setData((await res.json()) as RealtimeOverview);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-6">
      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between gap-4 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ PUBLICATIONS</span>
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
        {error ? (
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--crit)" }}>{error}</div>
        ) : !data ? (
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
        ) : data.publications.length === 0 ? (
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
            (no publications)
          </div>
        ) : (
          <Table>
            <THead cells={["Name", "Inserts", "Updates", "Deletes", "Truncates", "All tables"]} />
            <tbody>
              {data.publications.map((p) => (
                <tr key={p.name} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td><span className="type-mono">{p.name}</span></Td>
                  <YesNo on={p.replicates_inserts} />
                  <YesNo on={p.replicates_updates} />
                  <YesNo on={p.replicates_deletes} />
                  <YesNo on={p.replicates_truncates} />
                  <YesNo on={p.all_tables} />
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {data && (
        <Card>
          <div
            className="px-6 py-3 border-b"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow">
              § REPLICATED TABLES
              <span style={{ color: "var(--text-3)", marginLeft: 10 }}>
                {data.replicated_tables.length}
              </span>
            </span>
          </div>
          {data.replicated_tables.length === 0 ? (
            <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
              (no tables published)
            </div>
          ) : (
            <Table>
              <THead cells={["Publication", "Schema", "Table"]} />
              <tbody>
                {data.replicated_tables.map((t, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                    <Td><span className="type-mono">{t.publication}</span></Td>
                    <Td muted>{t.schema}</Td>
                    <Td><strong style={{ color: "var(--text)" }}>{t.table}</strong></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {data && data.replication_slots.length > 0 && (
        <Card>
          <div
            className="px-6 py-3 border-b"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow">§ REPLICATION SLOTS</span>
          </div>
          <Table>
            <THead cells={["Slot", "Plugin", "Type", "Active", "Restart LSN"]} />
            <tbody>
              {data.replication_slots.map((s) => (
                <tr key={s.slot_name} style={{ borderBottom: "1px solid var(--line)" }}>
                  <Td><span className="type-mono">{s.slot_name}</span></Td>
                  <Td muted>{s.plugin}</Td>
                  <Td muted>{s.slot_type}</Td>
                  <YesNo on={s.active} />
                  <Td muted><span className="type-mono" style={{ fontSize: 11 }}>{s.restart_lsn ?? "—"}</span></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  );
}
function THead({ cells }: { cells: string[] }) {
  return (
    <thead>
      <tr>
        {cells.map((c) => (
          <th
            key={c}
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
            {c}
          </th>
        ))}
      </tr>
    </thead>
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
function YesNo({ on }: { on: boolean }) {
  return (
    <td style={{ padding: "8px 12px", fontSize: 12 }}>
      {on ? (
        <span className="pill-ok type-mono" style={{ fontSize: 10, padding: "1px 6px" }}>yes</span>
      ) : (
        <span className="type-mono" style={{ fontSize: 11, color: "var(--text-4)" }}>no</span>
      )}
    </td>
  );
}
