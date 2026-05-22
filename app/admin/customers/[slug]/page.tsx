import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug } from "@/lib/db/vms";
import { statusPill } from "@/lib/utils";
import VmOperations from "./vm-operations";
import CustomerAlertsCallout from "@/components/customer-alerts-callout";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomerOverviewPage({ params }: PageProps) {
  const { slug } = await params;
  const [customer, vm] = await Promise.all([
    getCustomer(slug),
    getVmByCustomerSlug(slug),
  ]);
  if (!customer) notFound();

  return (
    <div className="space-y-14">
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

      {vm && <VmOperations slug={customer.slug} />}

      {vm && <CustomerAlertsCallout slug={customer.slug} />}

      {vm && (
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="type-h2">— TOOLS</h2>
            <span className="type-meta">Per-customer admin views</span>
          </div>
          <Card>
            <div className="px-8 py-2">
              <ul>
                {[
                  { href: `/admin/customers/${customer.slug}/metrics`, label: "Metrics", meta: "CPU · RAM · disk · network" },
                  { href: `/admin/customers/${customer.slug}/operations`, label: "VM resize", meta: "Cores, memory, disk" },
                  { href: `/admin/customers/${customer.slug}/snapshots`, label: "Snapshots", meta: "Take · revert · delete" },
                  { href: `/admin/customers/${customer.slug}/backups`, label: "Backups", meta: "Nightly + on-demand" },
                  { href: `/admin/customers/${customer.slug}/alerts`, label: "Alerts", meta: "Active + recent firings" },
                  { href: `/admin/customers/${customer.slug}/audit`, label: "Audit log", meta: "Every privileged action" },
                ].map((row) => (
                  <li
                    key={row.href}
                    className="border-b-hairline border-b last:border-b-0"
                    style={{ borderColor: "var(--color-hairline)" }}
                  >
                    <Link
                      href={row.href}
                      className="flex items-center justify-between py-5 group"
                    >
                      <div>
                        <div
                          className="font-medium text-[15px]"
                          style={{ color: "var(--color-navy)" }}
                        >
                          {row.label}
                        </div>
                        <div className="type-meta mt-1">{row.meta}</div>
                      </div>
                      <span
                        className="type-mono text-[12px]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— ADMIN</h2>
          <span className="type-meta">Provisioner jobs &amp; tools</span>
        </div>
        <Card>
          <div className="px-8 py-2">
            {customer.last_job_id ? (
              <ul>
                <li
                  className="border-b-hairline border-b last:border-b-0"
                  style={{ borderColor: "var(--color-hairline)" }}
                >
                  <Link
                    href={`/admin/customers/${customer.slug}/jobs/${customer.last_job_id}`}
                    className="flex items-center justify-between py-5 group"
                  >
                    <div>
                      <div
                        className="font-medium text-[15px]"
                        style={{ color: "var(--color-navy)" }}
                      >
                        Last provisioner job
                      </div>
                      <div className="type-meta mt-1">
                        Streamed logs from the most recent run
                      </div>
                    </div>
                    <span
                      className="type-mono text-[12px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {customer.last_job_id}
                    </span>
                  </Link>
                </li>
              </ul>
            ) : (
              <p className="type-meta py-5">
                No provisioner jobs yet for this customer.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
