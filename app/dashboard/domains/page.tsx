import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import DomainsOverview from "./domains-overview";

export const dynamic = "force-dynamic";

export default async function DashboardDomainsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Domains"
        title="Domains"
        subtitle="Custom hostnames mapped to your apps."
      />
      <DomainsOverview slug={slug} />
    </div>
  );
}
