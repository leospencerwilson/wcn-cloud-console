import { Card } from "@/components/ui/card";
import { listCustomers } from "@/lib/db/customers";
import { countAppUsers } from "@/lib/db/users";
import { countPendingInvites } from "@/lib/db/invites";
import { provisionerAlerts } from "@/lib/provisioner/alerts-client";
import { getCapacity } from "@/lib/provisioner/capacity-client";
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
  const [customers, userCount, pendingInvites, firingAlerts, headroom] =
    await Promise.all([
      listCustomers(),
      countAppUsers(),
      countPendingInvites(),
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
