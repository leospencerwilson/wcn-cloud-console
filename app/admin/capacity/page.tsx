import { requireWcnAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { getCapacity } from "@/lib/provisioner/capacity-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import type { CapacityReport } from "@/lib/provisioner/types";
import CapacityView from "./capacity-view";

export const dynamic = "force-dynamic";

export default async function AdminCapacityPage() {
  await requireWcnAdmin();
  let report: CapacityReport | null = null;
  let loadError: string | null = null;
  try {
    report = await getCapacity();
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      loadError = `${err.status} ${err.message}`;
    } else {
      loadError = err instanceof Error ? err.message : "unreachable";
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Capacity"
        title="Cluster capacity"
        subtitle="CPU, memory, and storage headroom across Proxmox nodes."
      />
      <CapacityView initial={report} initialError={loadError} />
    </div>
  );
}
