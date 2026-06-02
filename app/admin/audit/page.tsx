import { requireWcnAdmin } from "@/lib/auth/session";
import AuditTable from "@/components/audit-table";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireWcnAdmin();
  return (
    <div className="space-y-6">
      <header>
        <p className="type-eyebrow mb-5">§ AUDIT TRAIL</p>
        <p className="type-meta">
          Every privileged action across the fleet — VM lifecycle, deployments,
          domain changes, secret reveals, and admin operations.
        </p>
      </header>
      <AuditTable />
    </div>
  );
}
