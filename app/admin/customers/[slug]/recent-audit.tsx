import Link from "next/link";
import { Card } from "@/components/ui/card";
import { recentAuditForSlug } from "@/lib/db/customers";
import { RelativeTime } from "@/components/relative-time";

export default async function RecentAudit({ slug }: { slug: string }) {
  const rows = await recentAuditForSlug(slug, 5);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="type-h2">— RECENT ACTIVITY</h2>
        <Link
          href={`/admin/customers/${slug}/audit`}
          className="type-mono text-[12px]"
          style={{ color: "var(--color-navy)" }}
        >
          View all →
        </Link>
      </div>
      <Card>
        {rows.length === 0 ? (
          <p
            className="px-8 py-5 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            No activity recorded yet.
          </p>
        ) : (
          <ul>
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="px-6 py-4 flex items-center gap-4"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)",
                }}
              >
                <div className="flex-1">
                  <div className="text-[14px] font-medium type-mono">
                    {r.action}
                  </div>
                  <div className="type-meta mt-1">{r.actor}</div>
                </div>
                <span style={{ color: "var(--color-muted)" }}>
                  <RelativeTime iso={r.ts} className="type-mono text-[11px]" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
