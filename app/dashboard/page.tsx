import { notFound } from "next/navigation";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug } from "@/lib/db/vms";
import OverviewClient from "./overview-client";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const [customer, vm] = await Promise.all([
    getCustomer(slug),
    getVmByCustomerSlug(slug),
  ]);

  if (!customer) notFound();

  return (
    <OverviewClient
      slug={slug}
      vm={
        vm
          ? {
              vmid: vm.vmid,
              ip: vm.ip,
              status: vm.status,
              proxmox_node: vm.proxmox_node,
            }
          : null
      }
    />
  );
}
