"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  match?: (p: string) => boolean;
  badge?: { label: string; tone?: "crit" | "default" };
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/admin", match: (p) => p === "/admin" },
      { label: "Customers", href: "/admin/customers" },
      { label: "Capacity", href: "/admin/capacity" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { label: "Bulk ops", href: "/admin/bulk" },
      { label: "Alerts", href: "/admin/alerts" },
      { label: "Invites", href: "/admin/invites" },
    ],
  },
];

const CUSTOMER_SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        match: (p) => p === "/dashboard",
      },
      { label: "Apps", href: "/dashboard/apps" },
      { label: "Domains", href: "/dashboard/domains" },
      { label: "Coolify", href: "/dashboard/coolify" },
      { label: "Supabase", href: "/dashboard/supabase" },
      { label: "Database", href: "/dashboard/database" },
    ],
  },
  {
    heading: "Health",
    items: [
      { label: "Health", href: "/dashboard/health" },
      { label: "Audit", href: "/dashboard/audit" },
    ],
  },
  {
    heading: "Access",
    items: [
      { label: "Team", href: "/dashboard/team" },
      { label: "API tokens", href: "/dashboard/api-tokens" },
    ],
  },
];

function defaultMatch(href: string): (p: string) => boolean {
  return (p) => p === href || p.startsWith(`${href}/`);
}

type SwitcherInfo = {
  shortLabel: string;
  primary: string;
  secondary: string;
  tone: "brand" | "accent";
};

export default function Sidebar({
  variant,
  switcher,
  user,
  footer,
  showFooter = true,
}: {
  variant: "admin" | "customer";
  switcher: SwitcherInfo;
  user: { email: string; name?: string };
  footer?: ReactNode;
  showFooter?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const sections = variant === "admin" ? ADMIN_SECTIONS : CUSTOMER_SECTIONS;
  const avatarInitial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <aside
      style={{
        background: "var(--bg-2)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div
        className="flex items-center gap-2.5"
        style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: "-0.02em",
            color: "var(--brand-ink)",
            boxShadow:
              "0 0 0 1px color-mix(in oklch, var(--brand) 60%, transparent), 0 4px 12px -4px color-mix(in oklch, var(--brand) 40%, transparent)",
          }}
        >
          W
        </span>
        <div className="leading-tight">
          <div
            style={{ fontWeight: 600, fontSize: 13.5, letterSpacing: "-0.01em" }}
          >
            WCN Cloud
          </div>
          <div
            className="type-mono"
            style={{ fontSize: 11, color: "var(--text-3)" }}
          >
            {variant === "admin" ? "ops" : "console"}
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-2.5"
        style={{
          margin: "12px",
          padding: "8px 10px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-2)",
          background: "var(--surface)",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            background:
              switcher.tone === "accent"
                ? "color-mix(in oklch, var(--accent) 30%, var(--surface-2))"
                : "color-mix(in oklch, var(--brand) 30%, var(--surface-2))",
            display: "grid",
            placeItems: "center",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color:
              switcher.tone === "accent" ? "var(--accent)" : "var(--brand)",
          }}
        >
          {switcher.shortLabel}
        </span>
        <div className="flex-1 min-w-0">
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {switcher.primary}
          </div>
          <div
            className="type-mono"
            style={{ fontSize: 10.5, color: "var(--text-3)" }}
          >
            {switcher.secondary}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("wcn:open-palette"))}
        className="flex items-center gap-2"
        style={{
          margin: "0 12px 4px",
          padding: "7px 10px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-2)",
          color: "var(--text-3)",
          fontSize: 12,
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <span aria-hidden>⌕</span>
        <span>Jump to…</span>
        <span className="kbd" style={{ marginLeft: "auto" }}>
          ⌘K
        </span>
      </button>

      <div className="overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
        {sections.map((section, si) => (
          <div key={si} style={{ marginTop: si === 0 ? 6 : 18, padding: "0 12px" }}>
            {section.heading && (
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-4)",
                  padding: "0 8px 6px",
                  fontWeight: 500,
                }}
              >
                {section.heading}
              </div>
            )}
            <nav className="flex flex-col gap-px">
              {section.items.map((it) => {
                const match = it.match ?? defaultMatch(it.href);
                const active = match(pathname);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 8px",
                      borderRadius: "var(--r-2)",
                      color: active ? "var(--text)" : "var(--text-2)",
                      fontSize: 12.5,
                      background: active
                        ? "color-mix(in oklch, var(--brand) 12%, var(--surface))"
                        : "transparent",
                      position: "relative",
                      transition: "background .12s, color .12s",
                    }}
                    className="sb-link"
                  >
                    {active && (
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: -10,
                          top: 6,
                          bottom: 6,
                          width: 2,
                          background: "var(--brand)",
                          borderRadius: 2,
                        }}
                      />
                    )}
                    <span style={{ flex: 1 }}>{it.label}</span>
                    {it.badge && (
                      <span
                        style={{
                          fontSize: 10.5,
                          fontFamily: "var(--font-mono)",
                          padding: "0 5px",
                          height: 16,
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 8,
                          background:
                            it.badge.tone === "crit"
                              ? "color-mix(in oklch, var(--crit) 20%, var(--surface))"
                              : "var(--surface-2)",
                          color:
                            it.badge.tone === "crit"
                              ? "oklch(0.85 0.15 25)"
                              : "var(--text-3)",
                        }}
                      >
                        {it.badge.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {showFooter && (
        <div
          className="flex items-center gap-2.5"
          style={{
            marginTop: "auto",
            borderTop: "1px solid var(--line)",
            padding: "10px 16px",
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--brand-2), var(--accent))",
              display: "grid",
              placeItems: "center",
              color: "var(--bg)",
              fontWeight: 700,
              fontSize: 11,
            }}
          >
            {avatarInitial}
          </span>
          <div className="leading-tight min-w-0 flex-1">
            {user.name && (
              <div style={{ fontSize: 12, fontWeight: 500 }}>{user.name}</div>
            )}
            <div
              className="type-mono"
              style={{
                fontSize: 10.5,
                color: "var(--text-3)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.email}
            </div>
          </div>
          {footer}
        </div>
      )}
    </aside>
  );
}
