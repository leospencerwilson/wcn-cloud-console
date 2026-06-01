import { Card } from "@/components/ui/card";
import { listCustomers, recentAudit } from "@/lib/db/customers";
import { countAppUsers } from "@/lib/db/users";
import { countPendingInvites } from "@/lib/db/invites";
import { provisionerAlerts } from "@/lib/provisioner/alerts-client";
import { getCapacity } from "@/lib/provisioner/capacity-client";
import { RelativeTime } from "@/components/relative-time";
import type { AlertFiring, CapacityReport } from "@/lib/provisioner/types";

async function safeFiringAlertsCount(): Promise<number | null> {
  try {
    const firings = await provisionerAlerts.firings({ status: "firing", limit: 500 });
    return (firings as AlertFiring[]).filter((f) => f.status === "firing").length;
  } catch {
    return null;
  }
}

async function safeCapacityHeadroom(): Promise<number | null> {
  try {
    const report: CapacityReport = await getCapacity();
    if (!report.nodes.length) return null;
    let min = 1;
    for (const node of report.nodes) {
      const cpuFree = Math.max(0, 1 - node.cpu_used_frac);
      if (cpuFree < min) min = cpuFree;
      for (const s of node.storage) {
        if (s.total_bytes <= 0) continue;
        const diskFree = s.avail_bytes / s.total_bytes;
        if (diskFree < min) min = diskFree;
      }
    }
    return Math.round(min * 100);
  } catch {
    return null;
  }
}

export default async function AdminHome() {
  const [customers, userCount, pendingInvites, audit, firingAlerts, headroom] =
    await Promise.all([
      listCustomers(),
      countAppUsers(),
      countPendingInvites(),
      recentAudit(15),
      safeFiringAlertsCount(),
      safeCapacityHeadroom(),
    ]);

  return (
    <div className="space-y-14">
      <header>
        <p className="type-eyebrow mb-5">§ OVERVIEW</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat label="Customers" value={customers.length} delay={0} />
        <Stat label="Active users" value={userCount} delay={80} />
        <Stat label="Pending invites" value={pendingInvites} delay={160} />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat
          label="Failing jobs"
          value="—"
          delay={0}
          hint="Source not wired"
        />
        <Stat
          label="Firing alerts"
          value={firingAlerts ?? "—"}
          delay={80}
          hint={firingAlerts === null ? "Source not wired" : undefined}
        />
        <Stat
          label="Capacity headroom"
          value={headroom === null ? "—" : `${headroom}%`}
          delay={160}
          hint={
            headroom === null
              ? "Source not wired"
              : "Min free across CPU and disk"
          }
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— AUDIT TRAIL</h2>
          <span className="type-meta">Most recent 15 events</span>
        </div>
        <Card>
          <div className="px-8 py-6">
            {audit.length === 0 ? (
              <p className="type-meta">No events recorded yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Slug</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((row) => (
                    <tr key={row.id}>
                      <td className="type-mono" style={{ color: "var(--color-muted)" }}>
                        <RelativeTime iso={row.ts} />
                      </td>
                      <td>{row.actor}</td>
                      <td className="type-mono">{row.action}</td>
                      <td className="type-mono">{row.slug ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  delay,
  hint,
}: {
  label: string;
  value: number | string;
  delay: number;
  hint?: string;
}) {
  return (
    <div className="fade-rise" style={{ animationDelay: `${delay}ms` }}>
      <Card>
        <div className="px-8 py-8">
          <p className="type-eyebrow mb-6">— {label.toUpperCase()}</p>
          <div className="type-marquee" title={hint}>
            {value}
          </div>
          <p className="type-meta mt-4">{hint ?? label}</p>
        </div>
      </Card>
    </div>
  );
}
