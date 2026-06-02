"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh } from "@/components/ui/icons";
import type {
  StorageBucket,
  StorageObject,
  StorageObjectsResp,
} from "@/lib/provisioner/supabase-client";

const PAGE_SIZE = 100;

function fmtBytes(b: number | null): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export default function StorageView({ slug }: { slug: string }) {
  const [buckets, setBuckets] = useState<StorageBucket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/storage/buckets`, { cache: "no-store" });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${res.status}`);
      } else {
        const list = (await res.json()) as StorageBucket[];
        setBuckets(list);
        if (!selectedBucket && list.length > 0) setSelectedBucket(list[0].name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, selectedBucket]);

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);

  return (
    <div className="space-y-6">
      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">
            § BUCKETS
            {buckets && (
              <span style={{ color: "var(--text-3)", marginLeft: 10 }}>
                {buckets.length}
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
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--crit)" }}>
            {error}
          </div>
        ) : !buckets ? (
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
            Loading…
          </div>
        ) : buckets.length === 0 ? (
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
            (no buckets yet)
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Public", "Objects", "Total size", "Created"].map((h) => (
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
                {buckets.map((b) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      background: selectedBucket === b.name
                        ? "color-mix(in oklch, var(--brand) 8%, transparent)"
                        : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedBucket(b.name)}
                  >
                    <Td>
                      <strong style={{ color: "var(--text)" }}>{b.name}</strong>
                    </Td>
                    <Td muted>
                      {b.public ? "public" : "private"}
                    </Td>
                    <Td muted>{b.object_count.toLocaleString()}</Td>
                    <Td muted>{fmtBytes(b.total_bytes)}</Td>
                    <Td muted>{new Date(b.created_at).toLocaleDateString()}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedBucket && <ObjectsTable slug={slug} bucket={selectedBucket} />}
    </div>
  );
}

function ObjectsTable({ slug, bucket }: { slug: string; bucket: string }) {
  const [resp, setResp] = useState<StorageObjectsResp | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to page 1 when bucket changes
  useEffect(() => { setOffset(0); }, [bucket]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(
      `/api/customers/${slug}/supabase/storage/objects?bucket=${encodeURIComponent(bucket)}&limit=${PAGE_SIZE}&offset=${offset}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!alive) return;
        if (!r.ok) {
          const e = (await r.json().catch(() => ({}))) as { error?: string };
          setError(e.error || `HTTP ${r.status}`);
          setResp(null);
        } else {
          setResp((await r.json()) as StorageObjectsResp);
        }
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Network error"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug, bucket, offset]);

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § OBJECTS IN {bucket.toUpperCase()}
          {resp && (
            <span style={{ color: "var(--text-3)", marginLeft: 10 }}>
              {resp.total} total
            </span>
          )}
        </span>
      </div>
      {error ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--crit)" }}>{error}</div>
      ) : loading && !resp ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
      ) : !resp || resp.objects.length === 0 ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          (no objects in this bucket)
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Size", "Type", "Updated"].map((h) => (
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
              {resp.objects.map((o) => (
                <ObjectRow key={`${o.bucket_id}/${o.name}`} o={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resp && resp.total > PAGE_SIZE && (
        <div
          className="px-6 py-3 flex items-center justify-between gap-3 border-t"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-mono text-[11px]" style={{ color: "var(--text-3)" }}>
            {Math.min(resp.total, offset + 1)} – {Math.min(resp.total, offset + resp.objects.length)} of {resp.total}
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
              disabled={loading || offset + PAGE_SIZE >= resp.total}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ObjectRow({ o }: { o: StorageObject }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <Td><span className="type-mono" style={{ fontSize: 12 }}>{o.name}</span></Td>
      <Td muted>{fmtBytes(o.size_bytes)}</Td>
      <Td muted>{o.mime_type ?? "—"}</Td>
      <Td muted>{new Date(o.updated_at).toLocaleString()}</Td>
    </tr>
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
