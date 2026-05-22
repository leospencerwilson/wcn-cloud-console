import Link from "next/link";
import { requireCustomerAdmin } from "@/lib/auth/session";
import CertManager from "./cert-manager";

export const dynamic = "force-dynamic";

export default async function DashboardAppCertPage({
  params,
}: {
  params: Promise<{ id: string; hostname: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id, hostname } = await params;
  const decoded = decodeURIComponent(hostname);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/apps/${id}/domains`}
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          ← Domains
        </Link>
        <h2 className="type-h2 mt-2">{decoded} · TLS certificate</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          Upload your own certificate (PEM-encoded). The key never leaves the
          provisioner host and is not echoed back.
        </p>
      </div>
      <CertManager slug={slug} appId={id} hostname={decoded} />
    </div>
  );
}
