import { requireWcnAdmin } from "@/lib/auth/session";
import AuditTable from "@/components/audit-table";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireWcnAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit"
        title="Audit trail"
        subtitle="Every privileged action across the fleet — VM lifecycle, deployments, domain changes, secret reveals, and admin operations."
      />
      <AuditTable />
    </div>
  );
}
