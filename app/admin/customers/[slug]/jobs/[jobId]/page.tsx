import { notFound } from "next/navigation";
import Link from "next/link";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { JobLog } from "./job-log";
import { JobIdChip } from "./job-id-chip";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
}: {
  params: Promise<{ slug: string; jobId: string }>;
}) {
  await requireWcnAdmin();
  const { slug, jobId } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="type-eyebrow">
          § PROVISIONING —{" "}
          <Link
            href={`/admin/customers/${customer.slug}`}
            className="hover:opacity-60 transition-opacity underline-offset-2 hover:underline"
          >
            {customer.slug}
          </Link>
        </p>
        <h1 className="type-h1">{customer.name}.</h1>
        <p className="text-[15px] leading-[1.55]" style={{ color: "var(--color-muted)" }}>
          Live output from the orchestrator. Tier{" "}
          <span className="type-mono">{customer.tier}</span>. Job{" "}
          <JobIdChip jobId={jobId} />.
        </p>
      </header>

      <JobLog jobId={jobId} />

      <div className="pt-4">
        <Link
          href={`/admin/customers`}
          className="type-eyebrow hover:opacity-60 transition-opacity"
        >
          ← Back to customers
        </Link>
      </div>
    </div>
  );
}
