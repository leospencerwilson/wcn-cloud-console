import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug } from "@/lib/db/vms";
import { statusPill } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [customer, vm] = await Promise.all([
    getCustomer(slug),
    getVmByCustomerSlug(slug),
  ]);
  if (!customer) notFound();

  const apex = `${customer.slug}.western-communication.com`;

  return (
    <div className="space-y-14">
      <header>
        <p className="type-eyebrow mb-5">§ CUSTOMER</p>
        <h1 className="type-h1 mb-3">{customer.name}</h1>
        <p
          className="text-[15px] leading-[1.55] flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ color: "var(--color-muted)" }}
        >
          <span className="type-mono">{customer.slug}</span>
          <span aria-hidden>·</span>
          <span>
            Tier{" "}
            <strong style={{ color: "var(--color-charcoal)" }}>
              {customer.tier}
            </strong>
          </span>
          <span aria-hidden>·</span>
          <span className={statusPill(customer.status)}>{customer.status}</span>
        </p>
      </header>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— VM</h2>
          <span className="type-meta">Proxmox + cloudflared tunnel</span>
        </div>
        <Card>
          <div className="px-8 py-8">
            {vm ? (
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-7">
                <div>
                  <dt className="type-eyebrow mb-3">— VM ID</dt>
                  <dd className="type-mono text-[14px]">{vm.vmid}</dd>
                </div>
                <div>
                  <dt className="type-eyebrow mb-3">— IP</dt>
                  <dd className="type-mono text-[14px]">{vm.ip ?? "—"}</dd>
                </div>
                <div>
                  <dt className="type-eyebrow mb-3">— STATUS</dt>
                  <dd>
                    <span className={statusPill(vm.status)}>{vm.status}</span>
                  </dd>
                </div>
                <div>
                  <dt className="type-eyebrow mb-3">— HOST</dt>
                  <dd className="type-mono text-[14px]">
                    {vm.proxmox_node ?? "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="type-meta">No VM allocated yet.</p>
            )}
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— SERVICES</h2>
          <span className="type-meta">Open in a new tab</span>
        </div>
        <Card>
          <div className="px-8 py-2">
            <ul>
              <DetailLink
                title="Apps"
                description="Customer-deployed workloads (Traefik catch-all)"
                href={`https://${apex}`}
              />
              <DetailLink
                title="Coolify"
                description="Apps and deployments dashboard"
                href={`https://coolify.${apex}`}
              />
              <DetailLink
                title="Supabase Studio"
                description="Database, auth, storage"
                href={`https://studio.${apex}`}
              />
              <DetailLink
                title="API"
                description="Supabase Kong (PostgREST / Auth / Storage)"
                href={`https://api.${apex}`}
              />
              <DetailLink
                title="Health check"
                description="Caddy /healthz endpoint"
                href={`https://${apex}/healthz`}
              />
            </ul>
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— ADMIN</h2>
          <span className="type-meta">Provisioner jobs &amp; tools</span>
        </div>
        <Card>
          <div className="px-8 py-2">
            <ul>
              {customer.last_job_id ? (
                <DetailLink
                  title="Last provisioner job"
                  description="Streamed logs from the most recent run"
                  href={`/admin/customers/${customer.slug}/jobs/${customer.last_job_id}`}
                  internal
                />
              ) : null}
            </ul>
            {!customer.last_job_id ? (
              <p className="type-meta py-5">
                No provisioner jobs yet for this customer.
              </p>
            ) : null}
          </div>
        </Card>
      </section>
    </div>
  );
}

function DetailLink({
  title,
  description,
  href,
  internal = false,
}: {
  title: string;
  description: string;
  href: string;
  internal?: boolean;
}) {
  const display = internal ? href : href.replace(/^https?:\/\//, "");
  const inner = (
    <>
      <div>
        <div
          className="font-medium text-[15px]"
          style={{ color: "var(--color-navy)" }}
        >
          {title}
        </div>
        <div className="type-meta mt-1">{description}</div>
      </div>
      <span
        className="type-mono text-[12px]"
        style={{ color: "var(--color-muted)" }}
      >
        {display}
      </span>
    </>
  );
  return (
    <li
      className="border-b-hairline border-b last:border-b-0"
      style={{ borderColor: "var(--color-hairline)" }}
    >
      {internal ? (
        <Link
          href={href}
          className="flex items-center justify-between py-5 group"
        >
          {inner}
        </Link>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between py-5 group"
        >
          {inner}
        </a>
      )}
    </li>
  );
}
