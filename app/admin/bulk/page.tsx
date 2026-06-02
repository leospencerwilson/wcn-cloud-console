import Link from "next/link";
import { requireWcnAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { provisionerBulk } from "@/lib/provisioner/bulk-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import type { BulkJob } from "@/lib/provisioner/types";
import BulkList from "./bulk-list";
import { IconPlus } from "@/components/ui/icons";

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
      <PageHeader
        eyebrow="Bulk ops"
        title="Bulk operations"
        subtitle="Run actions across multiple customer VMs at once."
        actions={
          <Link href="/admin/bulk/new" className="btn btn-primary btn-sm">
            <IconPlus />
            New operation
          </Link>
        }
      />
      <BulkList initial={initial} initialError={loadError} />
    </div>
  );
}
