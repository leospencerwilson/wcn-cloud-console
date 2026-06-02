import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import EnvironmentOverview from "./environment-overview";

export const dynamic = "force-dynamic";

export default async function DashboardEnvironmentPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Environment"
        title="Environment variables"
        subtitle="Configuration values shared across your apps."
      />
      <EnvironmentOverview slug={slug} />
    </div>
  );
}
