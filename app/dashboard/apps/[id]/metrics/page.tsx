import { requireCustomerAdmin } from "@/lib/auth/session";
import MetricsDashboard from "@/components/metrics-dashboard";
import MetricsSparklines from "@/components/metrics-sparklines";

export const dynamic = "force-dynamic";

export default async function DashboardAppMetricsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  const endpoint = `/api/customers/${slug}/apps/${id}/metrics`;
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <span className="type-eyebrow">§ LAST 1 HOUR</span>
        <MetricsSparklines
          endpoint={endpoint}
          cards={[
            { key: "cpu" },
            { key: "ram" },
            { key: "net_in", label: "Network in" },
            { key: "net_out", label: "Network out" },
          ]}
        />
      </section>
      <section className="space-y-4">
        <span className="type-eyebrow">§ HISTORICAL</span>
        <MetricsDashboard
          endpoint={endpoint}
          allSeries={["cpu", "ram", "net"]}
          defaultSeries={["cpu", "ram", "net"]}
        />
      </section>
    </div>
  );
}
