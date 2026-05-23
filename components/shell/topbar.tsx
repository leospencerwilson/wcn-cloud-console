import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export default function Topbar({
  crumbs,
  actions,
}: {
  crumbs: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        height: 48,
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        gap: 16,
        background: "color-mix(in oklch, var(--bg-2) 60%, transparent)",
        backdropFilter: "blur(8px)",
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center"
        style={{ gap: 6, fontSize: 12.5, color: "var(--text-3)" }}
      >
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && (
              <span style={{ opacity: 0.4 }} aria-hidden>
                /
              </span>
            )}
            {c.href && i < crumbs.length - 1 ? (
              <a
                href={c.href}
                style={{ color: "var(--text-2)" }}
                className="hover:text-[color:var(--text)]"
              >
                {c.label}
              </a>
            ) : (
              <span style={{ color: "var(--text)" }}>{c.label}</span>
            )}
          </span>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}
