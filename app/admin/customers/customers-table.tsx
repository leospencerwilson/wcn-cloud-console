"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { statusPill } from "@/lib/utils";
import { RelativeTime, formatRelative } from "@/components/relative-time";
import { TierBadge } from "@/components/tier-badge";
import type { CustomerListRow } from "@/lib/db/customers";

type HeartbeatState = "online" | "offline" | "rebooting" | "unknown";

interface Heartbeat {
  state: HeartbeatState;
  latency_ms: number;
  status: number | null;
  checked_at: string;
}

type SortKey = "slug" | "name" | "tier" | "status" | "created";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

function dotMeta(state: HeartbeatState) {
  if (state === "online") return { cls: "dot dot-online", label: "Online" };
  if (state === "rebooting")
    return { cls: "dot dot-rebooting", label: "Rebooting" };
  if (state === "offline") return { cls: "dot dot-offline", label: "Offline" };
  return { cls: "dot", label: "Unknown" };
}

type BulkStatus = "pending" | "ok" | "err";

export function CustomersTable({ customers }: { customers: CustomerListRow[] }) {
  const router = useRouter();
  const [hb, setHb] = useState<Record<string, Heartbeat | null>>({});
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<
    Record<string, { state: BulkStatus; msg?: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    customers.forEach((c) => {
      if (c.status === "deleted" || c.status === "provisioning") {
        setHb((prev) => ({
          ...prev,
          [c.slug]: {
            state: "unknown",
            latency_ms: 0,
            status: null,
            checked_at: new Date().toISOString(),
          },
        }));
        return;
      }
      fetch(`/api/admin/customers/${c.slug}/heartbeat`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: Heartbeat | null) => {
          if (cancelled) return;
          setHb((prev) => ({ ...prev, [c.slug]: data }));
        })
        .catch(() => {
          if (cancelled) return;
          setHb((prev) => ({ ...prev, [c.slug]: null }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [customers]);

  const tiers = useMemo(
    () => Array.from(new Set(customers.map((c) => c.tier))).sort(),
    [customers],
  );
  const statuses = useMemo(
    () => Array.from(new Set(customers.map((c) => c.status))).sort(),
    [customers],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (tier && c.tier !== tier) return false;
      if (status && c.status !== status) return false;
      if (!q) return true;
      return (
        c.slug.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.contact_email.toLowerCase().includes(q)
      );
    });
  }, [customers, search, tier, status]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      if (sortKey === "created") {
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
      } else {
        av = (a[sortKey] ?? "").toString().toLowerCase();
        bv = (b[sortKey] ?? "").toString().toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, tier, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    let online = 0;
    let offline = 0;
    let rebooting = 0;
    let pending = 0;
    customers.forEach((c) => {
      const h = hb[c.slug];
      if (!h) {
        pending++;
        return;
      }
      if (h.state === "online") online++;
      else if (h.state === "offline") offline++;
      else if (h.state === "rebooting") rebooting++;
    });
    return { online, offline, rebooting, pending };
  }, [customers, hb]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sortIndicator = (k: SortKey) =>
    sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const pageSlugs = pageRows.map((r) => r.slug);
  const allOnPageSelected =
    pageSlugs.length > 0 && pageSlugs.every((s) => selected.has(s));
  const someOnPageSelected =
    pageSlugs.some((s) => selected.has(s)) && !allOnPageSelected;

  const toggleSelect = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageSlugs.forEach((s) => next.delete(s));
      } else {
        pageSlugs.forEach((s) => next.add(s));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setBulkStatus({});
  };

  const runReboot = async () => {
    const slugs = Array.from(selected);
    if (!slugs.length) return;
    if (!window.confirm(`Reboot ${slugs.length} VM${slugs.length === 1 ? "" : "s"}?`))
      return;
    setBulkBusy(true);
    setBulkStatus(Object.fromEntries(slugs.map((s) => [s, { state: "pending" }])));
    for (const slug of slugs) {
      try {
        const res = await fetch(`/api/customers/${slug}/vm/restart`, {
          method: "POST",
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setBulkStatus((p) => ({
            ...p,
            [slug]: { state: "err", msg: d.error || `HTTP ${res.status}` },
          }));
        } else {
          setBulkStatus((p) => ({ ...p, [slug]: { state: "ok" } }));
        }
      } catch (e) {
        setBulkStatus((p) => ({
          ...p,
          [slug]: { state: "err", msg: e instanceof Error ? e.message : "error" },
        }));
      }
    }
    setBulkBusy(false);
  };

  const runSnapshot = async () => {
    const slugs = Array.from(selected);
    if (!slugs.length) return;
    if (
      !window.confirm(
        `Snapshot ${slugs.length} VM${slugs.length === 1 ? "" : "s"}?`,
      )
    )
      return;
    const now = new Date();
    const stamp =
      now.getUTCFullYear().toString() +
      String(now.getUTCMonth() + 1).padStart(2, "0") +
      String(now.getUTCDate()).padStart(2, "0") +
      "-" +
      String(now.getUTCHours()).padStart(2, "0") +
      String(now.getUTCMinutes()).padStart(2, "0") +
      String(now.getUTCSeconds()).padStart(2, "0");
    const name = `bulk-${stamp}`;
    setBulkBusy(true);
    setBulkStatus(Object.fromEntries(slugs.map((s) => [s, { state: "pending" }])));
    for (const slug of slugs) {
      try {
        const res = await fetch(`/api/customers/${slug}/vm/snapshots`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, label: "bulk" }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setBulkStatus((p) => ({
            ...p,
            [slug]: { state: "err", msg: d.error || `HTTP ${res.status}` },
          }));
        } else {
          setBulkStatus((p) => ({ ...p, [slug]: { state: "ok" } }));
        }
      } catch (e) {
        setBulkStatus((p) => ({
          ...p,
          [slug]: { state: "err", msg: e instanceof Error ? e.message : "error" },
        }));
      }
    }
    setBulkBusy(false);
  };

  const openInBulk = () => {
    const slugs = Array.from(selected);
    if (!slugs.length) return;
    router.push(`/admin/bulk/new?slugs=${encodeURIComponent(slugs.join(","))}`);
  };

  const go = (slug: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e && "metaKey" in e && (e.metaKey || e.ctrlKey)) {
      window.open(`/admin/customers/${slug}`, "_blank");
      return;
    }
    router.push(`/admin/customers/${slug}`);
  };

  return (
    <div className="space-y-6">
      <p className="type-meta">
        {customers.length} customers
        {counts.pending === 0 ? (
          <>
            {" "}
            · {counts.online} online · {counts.rebooting} rebooting ·{" "}
            {counts.offline} offline
          </>
        ) : (
          <> · checking…</>
        )}
      </p>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search slug, name, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select
          className="field-input"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
        >
          <option value="">All tiers</option>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="field-input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="type-meta py-8">No customers match these filters.</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={togglePage}
                  />
                </th>
                <th>Live</th>
                <th
                  onClick={() => toggleSort("slug")}
                  style={{ cursor: "pointer" }}
                >
                  Slug{sortIndicator("slug")}
                </th>
                <th
                  onClick={() => toggleSort("name")}
                  style={{ cursor: "pointer" }}
                >
                  Company name{sortIndicator("name")}
                </th>
                <th
                  onClick={() => toggleSort("tier")}
                  style={{ cursor: "pointer" }}
                >
                  Tier{sortIndicator("tier")}
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  style={{ cursor: "pointer" }}
                >
                  Status{sortIndicator("status")}
                </th>
                <th>Host</th>
                <th>Primary email</th>
                <th
                  onClick={() => toggleSort("created")}
                  style={{ cursor: "pointer" }}
                >
                  Created{sortIndicator("created")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((c) => {
                const h = hb[c.slug];
                const state: HeartbeatState = h ? h.state : "unknown";
                const meta = dotMeta(state);
                let dotTitle: string = h ? meta.label : "checking…";
                if (h && h.state !== "unknown") {
                  dotTitle = `${meta.label} · ${h.latency_ms} ms · checked ${formatRelative(h.checked_at)}`;
                }
                const bs = bulkStatus[c.slug];
                const rowTitle = bs?.msg
                  ? `${bs.state}: ${bs.msg}`
                  : bs?.state;
                return (
                  <tr
                    key={c.slug}
                    role="button"
                    tabIndex={0}
                    aria-label={`${c.name} — ${meta.label}`}
                    className="cursor-pointer hover:bg-[rgba(7,14,116,0.03)]"
                    onClick={(e) => go(c.slug, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        go(c.slug, e);
                      }
                    }}
                    title={rowTitle}
                  >
                    <td
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "default" }}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.slug}`}
                        checked={selected.has(c.slug)}
                        onChange={() => toggleSelect(c.slug)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {bs && (
                        <span
                          className="type-mono"
                          style={{
                            marginLeft: 6,
                            fontSize: 10,
                            color:
                              bs.state === "ok"
                                ? "var(--color-success, #2f6b3a)"
                                : bs.state === "err"
                                  ? "var(--color-danger, #b03020)"
                                  : "var(--color-muted)",
                          }}
                        >
                          {bs.state === "pending"
                            ? "…"
                            : bs.state === "ok"
                              ? "✓"
                              : "!"}
                        </span>
                      )}
                    </td>
                    <td>
                      {h ? (
                        <span className={meta.cls} title={dotTitle} />
                      ) : (
                        <span
                          className="type-mono"
                          style={{ color: "var(--color-muted)" }}
                          title="checking…"
                        >
                          …
                        </span>
                      )}
                    </td>
                    <td className="type-mono">{c.slug}</td>
                    <td>{c.name}</td>
                    <td><TierBadge tierId={c.tier} /></td>
                    <td>
                      <span className={statusPill(c.status)}>{c.status}</span>
                    </td>
                    <td
                      className="type-mono"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {c.proxmox_node ?? "—"}
                    </td>
                    <td>{c.contact_email}</td>
                    <td
                      className="type-mono"
                      style={{ color: "var(--color-muted)" }}
                    >
                      <RelativeTime iso={c.created_at} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex items-center justify-between">
            <span className="type-meta">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {selected.size > 0 && (
        <div
          role="toolbar"
          aria-label="Bulk actions"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            background: "var(--color-charcoal, #1a1a1a)",
            border: "1px solid var(--color-hairline, #333)",
            borderRadius: 4,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <span
            className="type-mono"
            style={{ fontSize: 12, color: "var(--color-ivory)" }}
          >
            {selected.size} selected
          </span>
          <span
            aria-hidden
            style={{
              width: 1,
              height: 20,
              background: "var(--color-hairline, #333)",
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkBusy}
            onClick={runReboot}
          >
            Reboot
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkBusy}
            onClick={runSnapshot}
          >
            Snapshot
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={bulkBusy}
            onClick={openInBulk}
          >
            Open in bulk
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={bulkBusy}
            onClick={clearSelection}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default CustomersTable;
