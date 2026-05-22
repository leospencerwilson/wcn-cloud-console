import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import BackupsTable from "@/components/backups-table";

export const dynamic = "force-dynamic";

export default async function AdminCustomerBackupsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireWcnAdmin();
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/customers/${slug}`}
        className="type-mono text-[12px]"
        style={{ color: "var(--color-muted)" }}
      >
        ← {customer.name}
      </Link>
      <div>
        <h2 className="type-h2">{customer.name} · backups</h2>
      </div>
      <BackupsTable slug={slug} />
    </div>
  );
}
