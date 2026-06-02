"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import ThemeToggle from "./theme-toggle";

type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  match?: (p: string) => boolean;
  badge?: { label: string; tone?: "crit" | "default" };
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICON_SIZE = 15;
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      aria-hidden
      {...stroke}
    >
      {children}
    </svg>
  );
}

const I = {
  overview: (
    <Svg>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  ),
  apps: (
    <Svg>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 12l9 4 9-4" />
      <path d="M3 17l9 4 9-4" />
    </Svg>
  ),
  env: (
    <Svg>
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h16" />
      <circle cx="17" cy="12" r="1.6" />
    </Svg>
  ),
  domains: (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </Svg>
  ),
  coolify: (
    <Svg>
      <path d="M4 16a5 5 0 0 1 2-9.6a6.5 6.5 0 0 1 12.5 2A4.5 4.5 0 0 1 18 17H7a3 3 0 0 1-3-1z" />
    </Svg>
  ),
  supabase: (
    <Svg>
      <path d="M13 3L4 14h7l-1 7l9-11h-7l1-7z" />
    </Svg>
  ),
  database: (
    <Svg>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </Svg>
  ),
  health: (
    <Svg>
      <path d="M3 12h4l2-7l4 14l2-7h6" />
    </Svg>
  ),
  backups: (
    <Svg>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M21 3v6h-6" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  ),
  audit: (
    <Svg>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </Svg>
  ),
  team: (
    <Svg>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M15 14a5 5 0 0 1 6 4" />
    </Svg>
  ),
  tokens: (
    <Svg>
      <circle cx="8" cy="14" r="4" />
      <path d="M11 11l7-7" />
      <path d="M15 7l3 3" />
      <path d="M18 4l2 2" />
    </Svg>
  ),
  apiDocs: (
    <Svg>
      <path d="M4 4h11a3 3 0 0 1 3 3v13" />
      <path d="M4 4v16h11a3 3 0 0 1 3-3" />
      <path d="M8 8h6M8 12h6M8 16h4" />
    </Svg>
  ),
  customers: (
    <Svg>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </Svg>
  ),
  capacity: (
    <Svg>
      <path d="M12 21a9 9 0 1 0-9-9" />
      <path d="M12 12l5-3" />
    </Svg>
  ),
  tiers: (
    <Svg>
      <rect x="3" y="14" width="5" height="7" rx="1" />
      <rect x="9.5" y="9" width="5" height="12" rx="1" />
      <rect x="16" y="4" width="5" height="17" rx="1" />
    </Svg>
  ),
  auditAdmin: (
    <Svg>
      <path d="M3 5h18" />
      <path d="M3 12h12" />
      <path d="M3 19h18" />
      <circle cx="19" cy="12" r="2" />
    </Svg>
  ),
  bulk: (
    <Svg>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  ),
  alerts: (
    <Svg>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </Svg>
  ),
  invites: (
    <Svg>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6l9-6" />
    </Svg>
  ),
  logout: (
    <Svg>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5l-5-5" />
      <path d="M21 12H9" />
    </Svg>
  ),
};

const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/admin", icon: I.overview, match: (p) => p === "/admin" },
      { label: "Customers", href: "/admin/customers", icon: I.customers },
      { label: "Tiers", href: "/admin/tiers", icon: I.tiers },
      { label: "Capacity", href: "/admin/capacity", icon: I.capacity },
    ],
  },
  {
    heading: "Operations",
    items: [
      { label: "Bulk ops", href: "/admin/bulk", icon: I.bulk },
      { label: "Alerts", href: "/admin/alerts", icon: I.alerts },
      { label: "Invites", href: "/admin/invites", icon: I.invites },
      { label: "Audit", href: "/admin/audit", icon: I.auditAdmin },
    ],
  },
];

const CUSTOMER_SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: I.overview,
        match: (p) => p === "/dashboard",
      },
      { label: "Deployed Apps", href: "/dashboard/apps", icon: I.apps },
      { label: "Environment Variables", href: "/dashboard/environment", icon: I.env },
      { label: "Domains", href: "/dashboard/domains", icon: I.domains },
      { label: "Supabase", href: "/dashboard/supabase", icon: I.supabase },
      { label: "Database", href: "/dashboard/database", icon: I.database },
    ],
  },
  {
    heading: "Health",
    items: [
      { label: "Health", href: "/dashboard/health", icon: I.health },
      { label: "Backups", href: "/dashboard/backups", icon: I.backups },
      { label: "Audit", href: "/dashboard/audit", icon: I.audit },
    ],
  },
  {
    heading: "Access",
    items: [
      { label: "Team", href: "/dashboard/team", icon: I.team },
      { label: "API tokens", href: "/dashboard/api-tokens", icon: I.tokens },
      { label: "API docs", href: "/dashboard/api-docs", icon: I.apiDocs },
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
}: {
  variant: "admin" | "customer";
  switcher: SwitcherInfo;
  user: { email: string; name?: string };
  /** legacy props — kept for callers, no-op now */
  footer?: ReactNode;
  showFooter?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const sections = variant === "admin" ? ADMIN_SECTIONS : CUSTOMER_SECTIONS;
  const avatarInitial = (user.name || user.email).charAt(0).toUpperCase();
  const tone = switcher.tone === "accent" ? "var(--accent)" : "var(--brand)";
  const envLabel = variant === "admin" ? "ops" : "console";

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
      <div style={{ padding: 12, borderBottom: "1px solid var(--line)" }}>
        {/* Brand */}
        <div
          className="flex items-center gap-2.5"
          style={{ padding: "2px 2px 12px" }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background:
                "linear-gradient(135deg, var(--brand), var(--brand-2))",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 13,
              letterSpacing: "-0.02em",
              color: "var(--brand-ink)",
              boxShadow:
                "0 0 0 1px color-mix(in oklch, var(--brand) 55%, transparent), 0 6px 16px -6px color-mix(in oklch, var(--brand) 55%, transparent)",
              flexShrink: 0,
            }}
          >
            W
          </span>
          <div
            className="flex-1 min-w-0"
            style={{
              fontWeight: 650,
              fontSize: 14,
              letterSpacing: "-0.01em",
              color: "var(--text)",
              whiteSpace: "nowrap",
            }}
          >
            WCN Cloud
          </div>
          <span
            className="type-mono"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "3px 6px",
              borderRadius: 5,
              color: tone,
              background: `color-mix(in oklch, ${tone} 12%, var(--surface))`,
              border: `1px solid color-mix(in oklch, ${tone} 32%, var(--line))`,
            }}
          >
            {envLabel}
          </span>
        </div>

        {/* Current scope */}
        <div
          className="flex items-center gap-2.5"
          style={{
            padding: "8px 10px 8px 12px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-2)",
            background: "var(--surface)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 2.5,
              background: tone,
            }}
          />
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: `color-mix(in oklch, ${tone} 22%, var(--surface-2))`,
              display: "grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color: tone,
              flexShrink: 0,
            }}
          >
            {switcher.shortLabel}
          </span>
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 550,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "var(--text)",
              }}
            >
              {switcher.primary}
            </div>
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
              {switcher.secondary}
            </div>
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
                      padding: "7px 8px",
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
                    <span
                      aria-hidden
                      style={{
                        display: "inline-flex",
                        width: 16,
                        height: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        color: active ? "var(--brand)" : "var(--text-3)",
                      }}
                    >
                      {it.icon}
                    </span>
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

      <div
        style={{
          borderTop: "1px solid var(--line)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, var(--brand-2), var(--accent))",
            display: "grid",
            placeItems: "center",
            color: "var(--bg)",
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {avatarInitial}
        </span>
        <div className="leading-tight min-w-0 flex-1">
          {user.name && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user.name}
            </div>
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
            title={user.email}
          >
            {user.email}
          </div>
        </div>
        <ThemeToggle />
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            style={{
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--text-3)",
              borderRadius: "var(--r-2)",
              width: 28,
              height: 28,
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              padding: 0,
              transition: "color .12s, border-color .12s, background .12s",
            }}
            className="sb-logout"
          >
            {I.logout}
          </button>
        </form>
      </div>
    </aside>
  );
}
