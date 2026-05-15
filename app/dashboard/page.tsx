import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug } from "@/lib/db/vms";

function statusPill(status: string) {
  const key = status.toLowerCase();
  if (key === "active" || key === "running") return "pill pill-active";
  if (key === "provisioning") return "pill pill-provisioning";
  if (key === "deleted") return "pill pill-deleted";
  if (key === "pending") return "pill pill-pending";
  return "pill pill-used";
}

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
    <div className="space-y-14">
      <header>
        <p className="type-eyebrow mb-5">§ YOUR ENVIRONMENT</p>
        <h1 className="type-h1 mb-4">{customer.name}</h1>
        <p
          className="text-[15px] leading-[1.55] flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ color: "var(--color-muted)" }}
        >
          <span className="type-mono">{customer.slug}</span>
          <span aria-hidden>·</span>
          <span>
            Tier <strong style={{ color: "var(--color-charcoal)" }}>{customer.tier}</strong>
          </span>
          <span aria-hidden>·</span>
          <span className={statusPill(customer.status)}>{customer.status}</span>
        </p>
      </header>

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

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— QUICK LINKS</h2>
          <span className="type-meta">Opened on your customer subdomain</span>
        </div>
        <Card>
          <div className="px-8 py-2">
            <ul>
              <QuickLink
                title="Coolify"
                description="Apps and deployments"
                href={`https://${baseHost}/coolify`}
              />
              <QuickLink
                title="Supabase Studio"
                description="Database, auth, storage"
                href={`https://${baseHost}/supabase`}
              />
              <QuickLink
                title="Health check"
                description="Service status endpoint"
                href={`https://${baseHost}/healthz`}
              />
            </ul>
          </div>
        </Card>
      </section>
    </div>
  );
}

function QuickLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <li
      className="border-b-hairline border-b last:border-b-0"
      style={{ borderColor: "var(--color-hairline)" }}
    >
      <a
        href={href}
        className="flex items-center justify-between py-5 group"
      >
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
          {href.replace(/^https?:\/\//, "")}
        </span>
      </a>
    </li>
  );
}
