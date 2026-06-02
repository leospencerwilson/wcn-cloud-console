import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import BackupsTable from "@/components/backups-table";
import BackupPolicyForm from "@/components/backup-policy-form";

export const dynamic = "force-dynamic";

export default async function DashboardBackupsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Backups"
        title="Backups"
        subtitle="Snapshots and restore points for your VM."
      />
      <BackupPolicyForm slug={slug} />
      <BackupsTable slug={slug} canDownload />
    </div>
  );
}
