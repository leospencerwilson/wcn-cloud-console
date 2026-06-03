"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { IconChevronLeft, IconChevronRight, IconX } from "@/components/ui/icons";
import { RelativeTime } from "@/components/relative-time";
import { AuditAction } from "@/components/audit-action";

interface AuditRow {
  id: string;
  ts: string;
  actor: string;
  action: string;
  slug: string | null;
}

interface ApiResult {
  rows: AuditRow[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZES = [25, 50, 100, 200];

const inputStyle = {
  background: "transparent",
  border: "1px solid var(--color-hairline)",
  borderRadius: 2,
  color: "var(--color-ink)",
} as const;

export default function AuditTable({ slug }: { slug?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // Single free-text search — matches across actor + action + slug server-side.
  // The old separate Actor / Action inputs are gone; this carries their role.
  const [q, setQ] = useState(sp.get("q") ?? sp.get("actor") ?? sp.get("action") ?? "");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [limit, setLimit] = useState(Number(sp.get("limit") ?? "50"));
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [sort, setSort] = useState<"asc" | "desc">(
    sp.get("sort") === "asc" ? "asc" : "desc",
  );

  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const filtersKey = useMemo(
    () => JSON.stringify({ q: debouncedQ, from, to, limit, sort, slug }),
    [debouncedQ, from, to, limit, sort, slug],
  );

  const lastFiltersKey = useRef(filtersKey);
  useEffect(() => {
    if (lastFiltersKey.current !== filtersKey) {
      lastFiltersKey.current = filtersKey;
      setPage(1);
    }
  }, [filtersKey]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (limit !== 50) params.set("limit", String(limit));
    if (page !== 1) params.set("page", String(page));
    if (sort !== "desc") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedQ, from, to, limit, page, sort, pathname, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (slug) params.set("slug", slug);
      if (debouncedQ) {
        // Server still understands q + actor + action, so send q to all
        // three for max coverage until backend is consolidated.
        params.set("q", debouncedQ);
        params.set("actor", debouncedQ);
        params.set("action", debouncedQ);
      }
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("limit", String(limit));
      params.set("page", String(page));
      params.set("sort", sort);
      const res = await fetch(`/api/audit?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || `HTTP ${res.status}`);
        setData(null);
        return;
      }
      setData((await res.json()) as ApiResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, debouncedQ, from, to, limit, page, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setQ("");
    setFrom("");
    setTo("");
    setLimit(50);
    setSort("desc");
    setPage(1);
  };

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const rows = data?.rows ?? [];

  return (
    <div
      className="space-y-4"
      // Fit the audit panel to the viewport — no whole-page scrollbar; the
      // table body becomes the scroll container instead.
      style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)" }}
    >
      <Card>
        <div className="px-6 py-4 flex flex-wrap items-end gap-4">
          <label className="space-y-1" style={{ flex: 1, minWidth: 280 }}>
            <span className="type-eyebrow text-[10px]">Search</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="actor / action / slug — anything in the log"
              className="type-mono text-[13px] px-3 py-2"
              style={{ ...inputStyle, width: "100%" }}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="type-mono text-[12px] px-2 py-1"
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="type-mono text-[12px] px-2 py-1"
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Per page</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="type-mono text-[12px] px-2 py-1"
              style={inputStyle}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="vm-action-group" role="group" aria-label="Filter actions">
            <button type="button" className="vm-action vm-action--stop" onClick={clearFilters}>
              <IconX />
              <span>Clear filters</span>
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
          {error}
        </p>
      )}

      <Card>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              overflowY: "auto",
              maxHeight: "calc(100vh - 380px)",
              minHeight: 240,
            }}
          >
            {rows.length === 0 && !loading ? (
              <div className="px-8 py-6 space-y-3">
                <p className="type-meta">No events match these filters.</p>
                <div className="vm-action-group inline-flex" role="group" aria-label="Filter actions">
                  <button type="button" className="vm-action vm-action--stop" onClick={clearFilters}>
                    <IconX />
                    <span>Clear filters</span>
                  </button>
                </div>
              </div>
            ) : (
              <table className="data-table" style={{ width: "100%" }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
                  <tr>
                    <th>
                      <button
                        type="button"
                        onClick={() => setSort(sort === "asc" ? "desc" : "asc")}
                        style={{
                          background: "transparent",
                          border: 0,
                          padding: 0,
                          color: "inherit",
                          font: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        When {sort === "asc" ? "↑" : "↓"}
                      </button>
                    </th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Slug</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="type-mono" style={{ color: "var(--color-muted)" }}>
                        <RelativeTime iso={row.ts} />
                      </td>
                      <td>{row.actor}</td>
                      <td>
                        <AuditAction action={row.action} />
                      </td>
                      <td className="type-mono">{row.slug ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {rows.length > 0 && (
            <div
              className="px-8 py-4 flex items-center justify-between border-t"
              style={{ borderColor: "var(--color-hairline)" }}
            >
              <span className="type-meta">
                Page {data?.page ?? page} of {pages} · {total} total
              </span>
              <div className="vm-action-group" role="group" aria-label="Pagination">
                <button
                  type="button"
                  className="vm-action vm-action--view"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <IconChevronLeft />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  className="vm-action vm-action--view"
                  disabled={page >= pages || loading}
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                >
                  <IconChevronRight />
                  <span>Next</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
