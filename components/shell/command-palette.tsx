"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Cmd = {
  id: string;
  label: string;
  group: string;
  href?: string;
  hint?: string;
  action?: () => void;
};

const ADMIN_CMDS: Cmd[] = [
  { id: "a-ov", label: "Overview", group: "Admin", href: "/admin" },
  { id: "a-cs", label: "Customers", group: "Admin", href: "/admin/customers" },
  { id: "a-cap", label: "Capacity", group: "Admin", href: "/admin/capacity" },
  { id: "a-bk", label: "Bulk operations", group: "Admin", href: "/admin/bulk" },
  { id: "a-bn", label: "New bulk op", group: "Admin", href: "/admin/bulk/new" },
  { id: "a-al", label: "Alerts", group: "Admin", href: "/admin/alerts" },
  { id: "a-iv", label: "Invites", group: "Admin", href: "/admin/invites" },
];

const CUSTOMER_CMDS: Cmd[] = [
  // ── Navigate ────────────────────────────────────────────────────
  { id: "nav-ov", label: "Overview", group: "Navigate", href: "/dashboard", hint: "g o" },
  { id: "nav-apps", label: "Deployed apps", group: "Navigate", href: "/dashboard/apps", hint: "g a" },
  { id: "nav-env", label: "Environment variables", group: "Navigate", href: "/dashboard/environment" },
  { id: "nav-dom", label: "Custom domains", group: "Navigate", href: "/dashboard/domains" },
  { id: "nav-sb", label: "Supabase", group: "Navigate", href: "/dashboard/supabase" },
  { id: "nav-sb-tables", label: "Supabase → Tables", group: "Navigate", href: "/dashboard/supabase" },
  { id: "nav-sb-sql", label: "Supabase → SQL editor", group: "Navigate", href: "/dashboard/supabase/sql" },
  { id: "nav-sb-auth", label: "Supabase → Auth", group: "Navigate", href: "/dashboard/supabase/auth" },
  { id: "nav-sb-storage", label: "Supabase → Storage", group: "Navigate", href: "/dashboard/supabase/storage" },
  { id: "nav-sb-policies", label: "Supabase → Policies", group: "Navigate", href: "/dashboard/supabase/policies" },
  { id: "nav-sb-realtime", label: "Supabase → Realtime", group: "Navigate", href: "/dashboard/supabase/realtime" },
  { id: "nav-sb-functions", label: "Supabase → Functions", group: "Navigate", href: "/dashboard/supabase/functions" },
  { id: "nav-sb-conn", label: "Supabase → Connection", group: "Navigate", href: "/dashboard/supabase/connection" },
  { id: "nav-hl", label: "Health", group: "Navigate", href: "/dashboard/health" },
  { id: "nav-bk", label: "Backups", group: "Navigate", href: "/dashboard/backups" },
  { id: "nav-tm", label: "Team", group: "Navigate", href: "/dashboard/team" },
  { id: "nav-tk", label: "API tokens", group: "Navigate", href: "/dashboard/api-tokens" },
  { id: "nav-ad", label: "API docs", group: "Navigate", href: "/dashboard/api-docs" },
  { id: "nav-au", label: "Audit log", group: "Navigate", href: "/dashboard/audit" },
  { id: "nav-set", label: "Settings", group: "Navigate", href: "/dashboard/settings" },

  // ── Actions ─────────────────────────────────────────────────────
  { id: "act-new-app", label: "Create new app", group: "Actions", href: "/dashboard/apps/new", hint: "+" },
  { id: "act-new-table", label: "Create new table", group: "Actions", href: "/dashboard/supabase" },
  { id: "act-new-bucket", label: "Create new storage bucket", group: "Actions", href: "/dashboard/supabase/storage" },
  { id: "act-new-policy", label: "Create new RLS policy", group: "Actions", href: "/dashboard/supabase/policies" },
  { id: "act-new-fn", label: "Deploy new edge function", group: "Actions", href: "/dashboard/supabase/functions" },
  { id: "act-invite-user", label: "Invite team member", group: "Actions", href: "/dashboard/team" },
  { id: "act-new-token", label: "Create new API token", group: "Actions", href: "/dashboard/api-tokens" },
  { id: "act-add-domain", label: "Add custom domain", group: "Actions", href: "/dashboard/domains" },
  { id: "act-connect-gh", label: "Connect GitHub", group: "Actions", href: "/dashboard/settings" },
  { id: "act-run-backup", label: "Run backup now", group: "Actions", href: "/dashboard/backups" },
  { id: "act-open-studio", label: "Open Supabase Studio", group: "Actions", href: "/dashboard/supabase" },
];

export default function CommandPalette({
  variant,
}: {
  variant: "admin" | "customer";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => (variant === "admin" ? ADMIN_CMDS : CUSTOMER_CMDS),
    [variant],
  );
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((c) => c.label.toLowerCase().includes(t));
  }, [q, all]);

  useEffect(() => setIdx(0), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wcn:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wcn:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const run = (c: Cmd) => {
    setOpen(false);
    if (c.action) c.action();
    if (c.href) router.push(c.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[idx];
      if (c) run(c);
    }
  };

  const groups = Array.from(new Set(filtered.map((c) => c.group)));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "grid",
        placeItems: "start center",
        paddingTop: "12vh",
        animation: "fade-in .15s ease",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 620,
          maxWidth: "92vw",
          background: "var(--surface)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-4)",
          boxShadow: "var(--shadow-2)",
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center"
          style={{
            padding: "10px 14px",
            gap: 10,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span style={{ color: "var(--text-3)", fontSize: 14 }}>⌘</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions, or resources…"
            style={{
              background: "transparent",
              border: 0,
              outline: 0,
              flex: 1,
              fontSize: 14,
              color: "var(--text)",
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <div
          style={{
            maxHeight: 360,
            overflow: "auto",
            padding: 6,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "24px 10px",
                textAlign: "center",
                color: "var(--text-4)",
                fontSize: 12.5,
              }}
            >
              No matches.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g}>
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-4)",
                    padding: "8px 10px 4px",
                    fontWeight: 500,
                  }}
                >
                  {g}
                </div>
                {filtered
                  .filter((c) => c.group === g)
                  .map((c) => {
                    const active = filtered.indexOf(c) === idx;
                    return (
                      <div
                        key={c.id}
                        onMouseEnter={() => setIdx(filtered.indexOf(c))}
                        onClick={() => run(c)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: "var(--r-2)",
                          fontSize: 12.5,
                          color: active ? "var(--text)" : "var(--text-2)",
                          cursor: "pointer",
                          background: active ? "var(--surface-2)" : "transparent",
                        }}
                      >
                        <span style={{ flex: 1 }}>{c.label}</span>
                        {c.hint && (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontFamily: "var(--font-mono)",
                              fontSize: 10.5,
                              color: "var(--text-4)",
                            }}
                          >
                            {c.hint}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))
          )}
        </div>
        <div
          className="flex"
          style={{
            gap: 16,
            padding: "8px 14px",
            borderTop: "1px solid var(--line)",
            fontSize: 11,
            color: "var(--text-4)",
          }}
        >
          <span>
            <span className="kbd">↑↓</span> navigate
          </span>
          <span>
            <span className="kbd">↵</span> select
          </span>
          <span>
            <span className="kbd">esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
