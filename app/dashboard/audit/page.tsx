import { requireCustomerAdmin } from "@/lib/auth/session";
import AuditTable from "@/components/audit-table";

export const dynamic = "force-dynamic";

export default async function DashboardAuditPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">Audit log</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          Every privileged action taken on your account — VM lifecycle, deployments,
          domain changes, secret reveals.
        </p>
      </div>
      <AuditTable slug={slug} />
    </div>
  );
}
