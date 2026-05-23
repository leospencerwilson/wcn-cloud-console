import Link from "next/link";
import { requireWcnAdmin } from "@/lib/auth/session";
import BulkWizard from "./bulk-wizard";

export const dynamic = "force-dynamic";

export default async function AdminBulkNewPage() {
  await requireWcnAdmin();
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
      <h2 className="type-h2">New bulk operation</h2>
      <BulkWizard />
    </div>
  );
}
