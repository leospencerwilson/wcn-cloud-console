import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug, type Vm } from "@/lib/db/vms";
import { statusPill } from "@/lib/utils";
import CustomerAlertsCallout from "@/components/customer-alerts-callout";
import RecentAudit from "./recent-audit";
import RecentJobs from "./recent-jobs";

interface QuickLink {
  label: string;
  href: string;
  display: string;
}

function buildQuickLinks(slug: string, vm: Vm | null): QuickLink[] {
  const links: QuickLink[] = [];
  const proxmoxBase = process.env.PROXMOX_BASE_URL?.replace(/\/+$/, "");
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfZone = process.env.CLOUDFLARE_ZONE_NAME ?? "western-communication.com";

  if (vm && proxmoxBase) {
    const href = `${proxmoxBase}/#v1:0:=qemu/${vm.vmid}:4::::::`;
    links.push({
      label: "PROXMOX VM",
      href,
      display: `${proxmoxBase.replace(/^https?:\/\//, "")} · qemu/${vm.vmid}`,
    });
  }

  if (vm && vm.status !== "destroyed") {
    const href = `https://admin-${slug}.western-communication.com`;
    links.push({
      label: "COOLIFY",
      href,
      display: `admin-${slug}.western-communication.com`,
    });
  }

  if (cfAccount) {
    const href = vm?.tunnel_id
      ? `https://one.dash.cloudflare.com/${cfAccount}/networks/tunnels/cfd_tunnel/${vm.tunnel_id}`
      : `https://one.dash.cloudflare.com/${cfAccount}/networks/tunnels`;
    links.push({
      label: "CLOUDFLARE TUNNEL",
      href,
      display: vm?.tunnel_id ? vm.tunnel_id : "tunnels list",
    });

    links.push({
      label: "DNS RECORDS",
      href: `https://dash.cloudflare.com/${cfAccount}/${cfZone}/dns/records`,
      display: `${cfZone} · DNS`,
    });
  }

  return links;
}

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

  const quickLinks = buildQuickLinks(slug, vm);

  return (
    <div className="space-y-14">
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">§ VM</h2>
          <span className="type-meta">Proxmox + cloudflared tunnel</span>
        </div>
        <Card>
          <div className="px-8 py-8">
            {vm ? (
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-7">
                <div>
                  <dt className="type-eyebrow mb-3">§ VM ID</dt>
                  <dd className="type-mono text-[14px]">{vm.vmid}</dd>
                </div>
                <div>
                  <dt className="type-eyebrow mb-3">§ IP</dt>
                  <dd className="type-mono text-[14px]">{vm.ip ?? "—"}</dd>
                </div>
                <div>
                  <dt className="type-eyebrow mb-3">§ STATUS</dt>
                  <dd>
                    <span className={statusPill(vm.status)}>{vm.status}</span>
                  </dd>
                </div>
                <div>
                  <dt className="type-eyebrow mb-3">§ HOST</dt>
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

      {quickLinks.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="type-h2">§ QUICK LINKS</h2>
            <span className="type-meta">Jump to external dashboards</span>
          </div>
          <Card>
            <div className="px-8 py-8">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-7">
                {quickLinks.map((link) => (
                  <div key={link.label}>
                    <dt className="type-eyebrow mb-3">§ {link.label}</dt>
                    <dd>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="type-mono text-[13px]"
                        style={{ color: "var(--color-navy)" }}
                      >
                        {link.display} ↗
                      </a>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>
        </section>
      )}

      {vm && <RecentAudit slug={customer.slug} />}

      {vm && <CustomerAlertsCallout slug={customer.slug} />}

      {customer.last_job_id && (
        <RecentJobs slug={customer.slug} lastJobId={customer.last_job_id} />
      )}
    </div>
  );
}
