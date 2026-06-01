import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ProvisioningFailureRunbook() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="type-eyebrow">§ RUNBOOK</p>
        <h1 className="type-h1">Provisioning failure.</h1>
        <p className="text-[15px] leading-[1.55]" style={{ color: "var(--color-muted)" }}>
          Triage steps for a failed provision job.
        </p>
      </header>

      <ol className="space-y-4 text-[15px] leading-[1.6]" style={{ color: "var(--color-ink)" }}>
        <li>
          <strong>Capture the log.</strong> Use the download button on the job
          page; attach to the incident ticket.
        </li>
        <li>
          <strong>Identify the failed phase.</strong> Marked by × in the
          checklist. Phases: vm-create, cloud-init, coolify-install,
          supabase-up, dns, tunnel.
        </li>
        <li>
          <strong>Per-phase guidance.</strong> See{" "}
          <span className="type-mono">IaaS/runbooks/</span> in the repo for
          phase-specific recovery steps.
        </li>
        <li>
          <strong>Retry or rollback.</strong> Use Retry job for transient
          failures; for half-built state run{" "}
          <span className="type-mono">deprovision-customer.sh --force</span>{" "}
          first.
        </li>
      </ol>

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
