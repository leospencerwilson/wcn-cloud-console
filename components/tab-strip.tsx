"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export interface Tab {
  label: string;
  href: string;
  exact?: boolean;
  icon?: ReactNode;
}

export default function TabStrip({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className="border-b-hairline border-b"
      style={{ borderColor: "var(--color-hairline)" }}
    >
      <ul className="flex items-center gap-1 -mb-px">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-medium transition-colors"
                style={{
                  color: active ? "var(--brand)" : "var(--text-3)",
                  borderBottom: active
                    ? "1px solid var(--brand)"
                    : "1px solid transparent",
                }}
              >
                {t.icon && (
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      width: 14,
                      height: 14,
                      color: active ? "var(--brand)" : "var(--text-3)",
                    }}
                  >
                    {t.icon}
                  </span>
                )}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
