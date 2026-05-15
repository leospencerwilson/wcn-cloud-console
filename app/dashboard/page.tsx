import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug } from "@/lib/db/vms";

export default async function DashboardPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const [customer, vm] = await Promise.all([
    getCustomer(slug),
    getVmByCustomerSlug(slug),
  ]);

  if (!customer) notFound();

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const baseHost = `${slug}.${rootDomain}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-archivo text-3xl font-semibold text-brand-navy">
          {customer.name}
        </h1>
        <p className="text-neutral-600 text-sm mt-1">
          <span className="font-space-grotesk">{customer.slug}</span>
          <span className="text-neutral-400"> · </span>
          Plan: <strong>{customer.tier}</strong>
          <span className="text-neutral-400"> · </span>
          Status: <strong>{customer.status}</strong>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your VM</CardTitle>
          <CardDescription>
            Provisioning and routing information for your dedicated host.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vm ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-neutral-500">VM ID</dt>
                <dd className="font-space-grotesk">{vm.vmid}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">IP</dt>
                <dd className="font-space-grotesk">{vm.ip ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Status</dt>
                <dd className="font-medium">{vm.status}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Proxmox node</dt>
                <dd className="font-space-grotesk">{vm.proxmox_node ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-neutral-600">
              No VM has been provisioned yet. Your WCN contact will let you know
              when it's ready.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>
            These open on your customer subdomain — your browser session is
            already authorised.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                className="text-brand-navy underline"
                href={`https://${baseHost}/coolify`}
              >
                Coolify (apps &amp; deploys)
              </a>
            </li>
            <li>
              <a
                className="text-brand-navy underline"
                href={`https://${baseHost}/supabase`}
              >
                Supabase Studio (database)
              </a>
            </li>
            <li>
              <a
                className="text-brand-navy underline"
                href={`https://${baseHost}/healthz`}
              >
                Health check
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
