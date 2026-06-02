import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        eyebrow="Health"
        title="Health"
        subtitle="Live status and uptime for your environment."
      />

      <HealthPanel apex={apex} slug={slug} />

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
