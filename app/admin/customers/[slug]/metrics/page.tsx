import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import MetricsDashboard from "@/components/metrics-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminCustomerMetricsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireWcnAdmin();
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/customers/${slug}`}
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          ← {customer.name}
        </Link>
        <div className="mt-3 flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <p className="type-eyebrow mb-2">§ VM METRICS</p>
            <h2 className="type-h2">{customer.name}</h2>
          </div>
          <span className="type-meta">node_exporter via Prometheus on coolify VM</span>
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
