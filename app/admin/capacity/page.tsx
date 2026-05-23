import { requireWcnAdmin } from "@/lib/auth/session";
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
      <div>
        <h2 className="type-h2">Cluster capacity</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          Static snapshot of node load and headroom. Refresh on demand.
        </p>
      </div>
      <CapacityView initial={report} initialError={loadError} />
    </div>
  );
}
