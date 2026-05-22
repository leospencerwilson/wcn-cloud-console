import Link from "next/link";
import { Card } from "@/components/ui/card";
import { provisionerAlerts } from "@/lib/provisioner/alerts-client";
import type { AlertFiring, AlertSeverity } from "@/lib/provisioner/types";

function severityColor(s: AlertSeverity): string {
  if (s === "critical") return "var(--color-danger, #b03020)";
  if (s === "warning") return "var(--color-warning, #b07a1f)";
  return "var(--color-navy)";
}

function severityGlyph(s: AlertSeverity): string {
  if (s === "critical") return "●";
  if (s === "warning") return "▲";
  return "ⓘ";
}

export default async function CustomerAlertsCallout({ slug }: { slug: string }) {
  let firings: AlertFiring[] = [];
  let err: string | null = null;
  try {
    firings = await provisionerAlerts.firings({ slug, status: "firing", limit: 20 });
  } catch (e) {
    err = e instanceof Error ? e.message : "unreachable";
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="type-h2">— ALERTS</h2>
        <Link
          href={`/admin/customers/${slug}/alerts`}
          className="type-mono text-[12px]"
          style={{ color: "var(--color-navy)" }}
        >
          View all →
        </Link>
      </div>
      <Card>
        {err ? (
          <p
            className="px-8 py-5 type-mono text-[12px]"
            style={{ color: "var(--color-muted)" }}
          >
            Could not load alerts: {err}
          </p>
        ) : firings.length === 0 ? (
          <div className="px-8 py-6 flex items-center gap-3">
            <span aria-hidden style={{ color: "var(--color-success, #2f6b3a)" }}>
              ●
            </span>
            <span className="type-mono text-[13px]" style={{ color: "var(--color-muted)" }}>
              No alerts firing.
            </span>
          </div>
        ) : (
          <ul>
            {firings.map((f, i) => (
              <li
                key={f.id}
                className="px-6 py-4 flex items-center gap-4"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--color-hairline)",
                }}
              >
                <span aria-hidden style={{ color: severityColor(f.severity) }}>
                  {severityGlyph(f.severity)}
                </span>
                <div className="flex-1">
                  <div className="text-[14px] font-medium">{f.alertname}</div>
                  <div className="type-meta mt-1">{f.summary}</div>
                </div>
                <span
                  className="type-mono text-[11px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  {new Date(f.started_at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
