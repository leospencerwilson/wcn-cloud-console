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
      </div>

      <HealthPanel slug={slug} apex={apex} />

      <div>
        <h3 className="type-h3" style={{ marginBottom: 14 }}>
          Resources
        </h3>
        <MetricsDashboard
          endpoint={`/api/customers/${slug}/vm/metrics`}
          allSeries={["cpu", "ram", "disk", "net"]}
          defaultSeries={["cpu", "ram", "disk", "net"]}
        />
      </div>
    </div>
  );
}
