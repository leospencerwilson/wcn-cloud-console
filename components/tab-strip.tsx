"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface Tab {
  label: string;
  href: string;
  exact?: boolean;
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
                className="inline-flex items-center h-10 px-4 text-[13px] font-medium transition-colors"
                style={{
                  color: active ? "var(--color-navy)" : "var(--color-muted)",
                  borderBottom: active
                    ? "1px solid var(--color-navy)"
                    : "1px solid transparent",
                }}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
