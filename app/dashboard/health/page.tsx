import Link from "next/link";
import { requireCustomerAdmin } from "@/lib/auth/session";
import HealthPanel from "./health-panel";
import MetricsDashboard from "@/components/metrics-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardHealthPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const apex = `${slug}.${rootDomain}`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="type-h2">Health</h2>
        <p
          className="mt-2 text-[13px]"
          style={{ color: "var(--text-3)" }}
        >
          Live reachability probe to the apex domain, plus 30-day VM telemetry
          from Prometheus.
        </p>
      </div>

      <HealthPanel slug={slug} apex={apex} />

      <div>
        <div
          className="flex items-baseline justify-between"
          style={{ marginBottom: 14 }}
        >
          <h3 className="type-h3">Resources</h3>
          <Link
            href="/dashboard/backups"
            className="type-mono text-[12px]"
            style={{ color: "var(--brand)" }}
          >
            Backups →
          </Link>
        </div>
        <MetricsDashboard
          endpoint={`/api/customers/${slug}/vm/metrics`}
          allSeries={["cpu", "ram", "disk", "net"]}
          defaultSeries={["cpu", "ram", "disk", "net"]}
        />
      </div>
    </div>
  );
}
