import { requireWcnAdmin } from "@/lib/auth/session";
import AlertsDashboard from "@/components/alerts-dashboard";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function AdminAlertsPage() {
  await requireWcnAdmin();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Alerts"
        title="Alerts"
        subtitle="Active and historical alerts from the provisioner."
        actions={<span className="type-meta">Prometheus + Alertmanager</span>}
      />
      <AlertsDashboard />
    </div>
  );
}
