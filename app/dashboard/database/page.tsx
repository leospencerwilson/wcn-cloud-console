import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import DatabaseExplorer from "./database-explorer";

export const dynamic = "force-dynamic";

export default async function DashboardDatabasePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Database"
        title="Database"
        subtitle="Connection details and management for your database."
      />
      <DatabaseExplorer slug={slug} />
    </div>
  );
}
