import { notFound } from "next/navigation";
import TabStrip from "@/components/tab-strip";
import { getCustomer } from "@/lib/db/customers";
import { getVmByCustomerSlug } from "@/lib/db/vms";
import { statusPill } from "@/lib/utils";
import { TierBadge } from "@/components/tier-badge";
import ImpersonateButton from "./impersonate-button";
import VmActionButtons from "./vm-action-buttons";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CustomerLayout({ children, params }: Props) {
  const { slug } = await params;
  const [customer, vm] = await Promise.all([
    getCustomer(slug),
    getVmByCustomerSlug(slug),
  ]);
  if (!customer) notFound();

  const base = `/admin/customers/${slug}`;

  return (
    <div className="space-y-10">
      <header>
        <p className="type-eyebrow mb-5">§ CUSTOMER</p>
        <div className="flex items-start justify-between gap-6 flex-wrap mb-3">
          <h1 className="type-h1">{customer.name}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {vm ? (
              <VmActionButtons
                slug={customer.slug}
                customerName={customer.name}
              />
            ) : (
              <ImpersonateButton
                slug={customer.slug}
                customerName={customer.name}
              />
            )}
          </div>
        </div>
        <p
          className="text-[15px] leading-[1.55] flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ color: "var(--color-muted)" }}
        >
          <span className="type-mono">{customer.slug}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-2">
            Tier <TierBadge tierId={customer.tier} />
          </span>
          <span aria-hidden>·</span>
          <span className={statusPill(customer.status)}>{customer.status}</span>
        </p>
      </header>

      <TabStrip
        tabs={[
          { label: "Overview", href: base, exact: true },
          { label: "Metrics", href: `${base}/metrics` },
          { label: "Operations", href: `${base}/operations` },
          { label: "Snapshots", href: `${base}/snapshots` },
          { label: "Backups", href: `${base}/backups` },
          { label: "Alerts", href: `${base}/alerts` },
          { label: "Audit", href: `${base}/audit` },
          { label: "Coolify", href: `${base}/coolify` },
          { label: "Supabase", href: `${base}/supabase` },
          { label: "Health", href: `${base}/health` },
          { label: "Settings", href: `${base}/settings` },
        ]}
      />

      <div>{children}</div>
    </div>
  );
}
