"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh } from "@/components/ui/icons";
import type { FunctionsOverview } from "@/lib/provisioner/supabase-client";

export default function FunctionsView({
  slug,
}: {
  slug: string;
}) {
  const [data, setData] = useState<FunctionsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/functions`, { cache: "no-store" });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${res.status}`);
      } else {
        setData((await res.json()) as FunctionsOverview);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § EDGE FUNCTIONS
          {data && (
            <span style={{ color: "var(--text-3)", marginLeft: 10 }}>
              {data.functions.length}
            </span>
          )}
        </span>
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
      ) : data.functions.length === 0 ? (
        <div className="px-8 py-7 space-y-3">
          <p className="text-[13.5px]" style={{ color: "var(--text-2)" }}>
            No Edge Functions registered in the <code className="type-mono">supabase_functions</code> schema yet.
          </p>
          <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
            Deploy new functions with the Supabase CLI, pointed at your project URL
            from the <strong>Connection</strong> tab:
          </p>
          <pre
            className="type-mono"
            style={{
              padding: "10px 12px",
              background: "var(--surface-1)",
              border: "1px solid var(--line)",
              borderRadius: 3,
              fontSize: 12,
              color: "var(--text-2)",
              overflowX: "auto",
            }}
          >
{`supabase functions deploy hello --project-ref <ref>`}
          </pre>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Schema", "Name"].map((h) => (
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
              {data.functions.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td className="type-mono" style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-3)" }}>
                    {f.schema}
                  </td>
                  <td className="type-mono" style={{ padding: "8px 12px", fontSize: 12, color: "var(--text)" }}>
                    <strong>{f.name}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div
          className="px-6 py-3 border-t"
          style={{ borderColor: "var(--color-hairline)", color: "var(--text-3)", fontSize: 12 }}
        >
          {data.runtime_note}
        </div>
      )}
    </Card>
  );
}
