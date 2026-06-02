import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import AuditTable from "@/components/audit-table";

export const dynamic = "force-dynamic";

export default async function DashboardAuditPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit"
        title="Audit log"
        subtitle="Every privileged action taken on your account — VM lifecycle, deployments, domain changes, secret reveals."
      />
      <AuditTable slug={slug} />
    </div>
  );
}
