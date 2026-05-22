import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import AlertsDashboard from "@/components/alerts-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminCustomerAlertsPage({
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
            <p className="type-eyebrow mb-2">§ ALERTS</p>
            <h2 className="type-h2">{customer.name}</h2>
          </div>
          <span className="type-meta">Scoped to this customer</span>
        </div>
      </div>
      <AlertsDashboard slug={slug} showCustomer={false} showRules={false} />
    </div>
  );
}
