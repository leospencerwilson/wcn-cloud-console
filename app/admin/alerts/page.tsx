import { requireWcnAdmin } from "@/lib/auth/session";
import AlertsDashboard from "@/components/alerts-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminAlertsPage() {
  await requireWcnAdmin();
  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">— ALERTS</h2>
        <span className="type-meta">Prometheus + Alertmanager</span>
      </div>
      <AlertsDashboard />
    </div>
  );
}
