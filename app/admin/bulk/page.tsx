import Link from "next/link";
import { requireWcnAdmin } from "@/lib/auth/session";
import { provisionerBulk } from "@/lib/provisioner/bulk-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import type { BulkJob } from "@/lib/provisioner/types";
import BulkList from "./bulk-list";

export const dynamic = "force-dynamic";

export default async function AdminBulkPage() {
  await requireWcnAdmin();
  let initial: BulkJob[] = [];
  let loadError: string | null = null;
  try {
    initial = await provisionerBulk.list(50);
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      loadError = `${err.status} ${err.message}`;
    } else {
      loadError = err instanceof Error ? err.message : "unreachable";
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="type-h2">Bulk operations</h2>
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
            Whitelisted ops across many customer VMs. Concurrency cap 5. No
            staged rollout in v1.
          </p>
        </div>
        <Link href="/admin/bulk/new" className="btn btn-primary btn-sm">
          New operation
        </Link>
      </div>
      <BulkList initial={initial} initialError={loadError} />
    </div>
  );
}
