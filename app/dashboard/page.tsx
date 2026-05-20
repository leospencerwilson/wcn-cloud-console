import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug } from "@/lib/db/vms";
import { statusPill } from "@/lib/utils";

export default async function DashboardOverviewPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const [customer, vm] = await Promise.all([
    getCustomer(slug),
    getVmByCustomerSlug(slug),
  ]);

  if (!customer) notFound();

  return (
    <div className="space-y-14">
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— YOUR VM</h2>
          <span className="type-meta">Provisioning &amp; routing</span>
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
                  <dt className="type-eyebrow mb-3">— PROXMOX NODE</dt>
                  <dd className="type-mono text-[14px]">
                    {vm.proxmox_node ?? "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="type-meta">
                No VM has been provisioned yet. Your WCN contact will let you
                know when it is ready.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
