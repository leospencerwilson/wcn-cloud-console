import Link from "next/link";
import { requireCustomerAdmin } from "@/lib/auth/session";
import MetricsDashboard from "@/components/metrics-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardHealthMetricsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/health"
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          ← Health
        </Link>
        <div className="mt-3 flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <p className="type-eyebrow mb-2">§ VM METRICS</p>
            <h2 className="type-h2">Resources</h2>
          </div>
          <span className="type-meta">Prometheus · 30-day retention</span>
        </div>
      </div>
      <MetricsDashboard
        endpoint={`/api/customers/${slug}/vm/metrics`}
        allSeries={["cpu", "ram", "disk", "net"]}
        defaultSeries={["cpu", "ram", "disk", "net"]}
      />
    </div>
  );
}
