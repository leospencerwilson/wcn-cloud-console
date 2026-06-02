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

const PAGE_SIZES = [10, 25, 50, 100];

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

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [actor, setActor] = useState(sp.get("actor") ?? "");
  const [action, setAction] = useState(sp.get("action") ?? "");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [limit, setLimit] = useState(Number(sp.get("limit") ?? "25"));
  const [page, setPage] = useState(Number(sp.get("page") ?? "1"));
  const [sort, setSort] = useState<"asc" | "desc">(
    sp.get("sort") === "asc" ? "asc" : "desc",
  );

  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [debounced, setDebounced] = useState({ q, actor, action });
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q, actor, action }), 300);
    return () => clearTimeout(t);
  }, [q, actor, action]);

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        q: debounced.q,
        actor: debounced.actor,
        action: debounced.action,
        from,
        to,
        limit,
        sort,
        slug,
      }),
    [debounced, from, to, limit, sort, slug],
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
    if (debounced.q) params.set("q", debounced.q);
    if (debounced.actor) params.set("actor", debounced.actor);
    if (debounced.action) params.set("action", debounced.action);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (limit !== 25) params.set("limit", String(limit));
    if (page !== 1) params.set("page", String(page));
    if (sort !== "desc") params.set("sort", sort);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debounced, from, to, limit, page, sort, pathname, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (slug) params.set("slug", slug);
      if (debounced.q) params.set("q", debounced.q);
      if (debounced.actor) params.set("actor", debounced.actor);
      if (debounced.action) params.set("action", debounced.action);
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
  }, [slug, debounced, from, to, limit, page, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setQ("");
    setActor("");
    setAction("");
    setFrom("");
    setTo("");
    setLimit(25);
    setSort("desc");
    setPage(1);
  };

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const rows = data?.rows ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="px-6 py-4 flex flex-wrap items-end gap-4">
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Search</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="actor / action / slug"
              className="type-mono text-[12px] px-2 py-1"
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Actor</span>
            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              className="type-mono text-[12px] px-2 py-1"
              style={inputStyle}
            />
          </label>
          <label className="space-y-1">
            <span className="type-eyebrow text-[10px]">Action</span>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="type-mono text-[12px] px-2 py-1"
              style={inputStyle}
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
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex-1" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
            <IconX />
            Clear filters
          </button>
        </div>
      </Card>

      {error && (
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </p>
      )}

      <Card>
        <div className="px-8 py-6">
          {rows.length === 0 && !loading ? (
            <div className="space-y-3">
              <p className="type-meta">No events match these filters.</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={clearFilters}
              >
                <IconX />
                Clear filters
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
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
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <IconChevronLeft />
                Prev
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= pages || loading}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                <IconChevronRight />
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
