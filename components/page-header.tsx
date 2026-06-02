import type { ReactNode } from "react";

/**
 * Standard page header used by every top-level tab (admin and customer).
 * Renders an uppercase § eyebrow, a normal-case title, and an optional
 * one-line subtitle. Header-level actions (e.g. a primary button) go in
 * the `actions` slot and sit on the right.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p className="type-eyebrow mb-3">§ {eyebrow}</p>
        <h1 className="type-h1">{title}</h1>
        {subtitle && (
          <p
            className="type-meta mt-2"
            style={{ maxWidth: "42rem", lineHeight: 1.5 }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </header>
  );
}

export default PageHeader;
