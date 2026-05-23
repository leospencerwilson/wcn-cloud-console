"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { App, EnvVar } from "@/lib/provisioner/types";

type Row = {
  app: App;
  env: EnvVar;
  kind: "runtime" | "build" | "preview";
};

function kindOf(e: EnvVar): Row["kind"] {
  if (e.is_preview) return "preview";
  if (e.is_build_time) return "build";
  return "runtime";
}

function kindTone(k: Row["kind"]): string {
  if (k === "build") return "var(--accent)";
  if (k === "preview") return "var(--warn)";
  return "var(--brand)";
}

function mask(value: string): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)} · ${value.length} ch`;
}

export default function EnvironmentOverview({ slug }: { slug: string }) {
  const [apps, setApps] = useState<App[] | null>(null);
  const [byApp, setByApp] = useState<Record<string, EnvVar[]>>({});
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | Row["kind"]>("all");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/customers/${slug}/apps`, {
          cache: "no-store",
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `${r.status}`);
        }
        const list = (await r.json()) as App[];
        if (!alive) return;
        setApps(list);
        const results = await Promise.all(
          list.map(async (a) => {
            try {
              const er = await fetch(
                `/api/customers/${slug}/apps/${a.id}/env`,
                { cache: "no-store" },
              );
              if (!er.ok) return [a.id, [] as EnvVar[]] as const;
              return [a.id, (await er.json()) as EnvVar[]] as const;
            } catch {
              return [a.id, [] as EnvVar[]] as const;
            }
          }),
        );
        if (!alive) return;
        const next: Record<string, EnvVar[]> = {};
        for (const [id, env] of results) next[id] = env;
        setByApp(next);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const rows: Row[] = useMemo(() => {
    if (!apps) return [];
    const out: Row[] = [];
    for (const app of apps) {
      const env = byApp[app.id];
      if (!env) continue;
      for (const e of env) out.push({ app, env: e, kind: kindOf(e) });
    }
    return out;
  }, [apps, byApp]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!needle) return true;
      return (
        r.env.key.toLowerCase().includes(needle) ||
        r.env.value.toLowerCase().includes(needle) ||
        r.app.name.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, kindFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { app: App; rows: Row[] }>();
    for (const r of filtered) {
      const g = map.get(r.app.id) ?? { app: r.app, rows: [] };
      g.rows.push(r);
      map.set(r.app.id, g);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.app.name.localeCompare(b.app.name),
    );
  }, [filtered]);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalVars = rows.length;
  const totalApps = apps?.length ?? 0;
  const loading = apps === null;

  return (
    <div className="space-y-4">
      <section
        className="surface-card"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search key, value, or app…"
          className="field-input"
          style={{ flex: 1, minWidth: 240 }}
        />
        <div className="ios-segment" role="tablist" aria-label="Filter by kind">
          {(
            [
              { v: "all", l: "All" },
              { v: "runtime", l: "Runtime" },
              { v: "build", l: "Build" },
              { v: "preview", l: "Preview" },
            ] as const
          ).map((opt) => (
            <button
              type="button"
              key={opt.v}
              role="tab"
              aria-selected={kindFilter === opt.v}
              className={`ios-segment-item${
                kindFilter === opt.v ? " is-active" : ""
              }`}
              onClick={() => setKindFilter(opt.v)}
            >
              {opt.l}
            </button>
          ))}
        </div>
        <span
          className="type-mono"
          style={{ fontSize: 11.5, color: "var(--text-3)" }}
        >
          {filtered.length} / {totalVars} vars · {totalApps} apps
        </span>
      </section>

      {err && (
        <div
          className="surface-card"
          style={{
            padding: "12px 16px",
            color: "var(--crit)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      {loading && (
        <div
          className="surface-card"
          style={{
            padding: "16px",
            color: "var(--text-3)",
            fontSize: 13,
          }}
        >
          Loading environment variables…
        </div>
      )}

      {!loading && grouped.length === 0 && (
        <div
          className="surface-card"
          style={{
            padding: "24px 16px",
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: 13,
          }}
        >
          {totalVars === 0
            ? "No environment variables defined across your apps yet."
            : "Nothing matches your filter."}
        </div>
      )}

      {grouped.map(({ app, rows: appRows }) => (
        <section
          key={app.id}
          className="surface-card"
          style={{ padding: 0, overflow: "hidden" }}
        >
          <header
            className="flex items-center justify-between gap-3 flex-wrap"
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                {app.name}
              </span>
              <span
                className="type-mono"
                style={{ fontSize: 11, color: "var(--text-4)" }}
              >
                {app.id.slice(0, 8)}
              </span>
              <span
                className="type-mono"
                style={{ fontSize: 11, color: "var(--text-3)" }}
              >
                {appRows.length} {appRows.length === 1 ? "var" : "vars"}
              </span>
            </div>
            <Link
              href={`/dashboard/apps/${app.id}/env`}
              className="btn btn-ghost btn-sm"
            >
              Edit →
            </Link>
          </header>
          <div>
            {appRows.map((r, i) => {
              const id = `${r.app.id}:${r.env.key}`;
              const isRevealed = revealed.has(id);
              return (
                <div
                  key={id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 1fr) 90px 2fr 90px",
                    gap: 16,
                    alignItems: "center",
                    padding: "10px 16px",
                    borderTop: i === 0 ? "0" : "1px solid var(--line)",
                  }}
                >
                  <span
                    className="type-mono"
                    style={{
                      fontSize: 12.5,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={r.env.key}
                  >
                    {r.env.key}
                  </span>
                  <span
                    className="type-mono"
                    style={{
                      fontSize: 10.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: kindTone(r.kind),
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: `1px solid color-mix(in oklch, ${kindTone(r.kind)} 40%, transparent)`,
                      background: `color-mix(in oklch, ${kindTone(r.kind)} 10%, transparent)`,
                      justifySelf: "start",
                    }}
                  >
                    {r.kind}
                  </span>
                  <span
                    className="type-mono"
                    style={{
                      fontSize: 12.5,
                      color: isRevealed ? "var(--text)" : "var(--text-3)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={isRevealed ? r.env.value : undefined}
                  >
                    {isRevealed ? r.env.value || "(empty)" : mask(r.env.value)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleReveal(id)}
                    style={{ justifySelf: "end" }}
                  >
                    {isRevealed ? "Hide" : "Reveal"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
