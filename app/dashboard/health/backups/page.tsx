import { requireCustomerAdmin } from "@/lib/auth/session";
import BackupsTable from "@/components/backups-table";

export const dynamic = "force-dynamic";

export default async function DashboardBackupsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">Backups</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          Nightly snapshots of your VM, plus on-demand triggers. Objects are stored in B2.
        </p>
      </div>
      <BackupsTable slug={slug} />
    </div>
  );
}
