import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWcnAdmin } from "@/lib/auth/session";
import { provisionerBulk } from "@/lib/provisioner/bulk-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import type { BulkJob } from "@/lib/provisioner/types";
import BulkDetail from "./bulk-detail";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function AdminBulkDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  await requireWcnAdmin();
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId <= 0) notFound();

  let initial: BulkJob | null = null;
  let loadError: string | null = null;
  try {
    initial = await provisionerBulk.get(jobId);
  } catch (err) {
    if (err instanceof ProvisionerHttpError && err.status === 404) notFound();
    if (err instanceof ProvisionerHttpError) {
      loadError = `${err.status} ${err.message}`;
    } else {
      loadError = err instanceof Error ? err.message : "unreachable";
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/bulk"
          className="type-mono text-[11px]"
          style={{ color: "var(--color-muted)" }}
        >
          ← Bulk operations
        </Link>
      </div>
      <h2 className="type-h2">Bulk job #{jobId}</h2>
      <BulkDetail jobId={jobId} initial={initial} initialError={loadError} />
    </div>
  );
}
