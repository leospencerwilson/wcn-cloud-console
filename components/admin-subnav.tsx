"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { label: string; href: string; match: (p: string) => boolean }[] = [
  { label: "Overview", href: "/admin", match: (p) => p === "/admin" },
  {
    label: "Customers",
    href: "/admin/customers",
    match: (p) => p.startsWith("/admin/customers"),
  },
  {
    label: "Tiers",
    href: "/admin/tiers",
    match: (p) => p.startsWith("/admin/tiers"),
  },
  {
    label: "Invites",
    href: "/admin/invites",
    match: (p) => p.startsWith("/admin/invites"),
  },
  {
    label: "Alerts",
    href: "/admin/alerts",
    match: (p) => p.startsWith("/admin/alerts"),
  },
  {
    label: "Capacity",
    href: "/admin/capacity",
    match: (p) => p.startsWith("/admin/capacity"),
  },
  {
    label: "Bulk ops",
    href: "/admin/bulk",
    match: (p) => p.startsWith("/admin/bulk"),
  },
];

export default function AdminSubnav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="border-b-hairline border-b" style={{ borderColor: "var(--color-hairline)" }}>
      <div className="mx-auto max-w-6xl px-6">
        <ul className="flex items-center gap-1 h-12 -mb-px">
          {ITEMS.map((it) => {
            const active = it.match(pathname);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className="inline-flex items-center h-12 px-4 text-[13px] font-medium transition-colors"
                  style={{
                    color: active ? "var(--color-navy)" : "var(--color-muted)",
                    borderBottom: active
                      ? "1px solid var(--color-navy)"
                      : "1px solid transparent",
                  }}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
