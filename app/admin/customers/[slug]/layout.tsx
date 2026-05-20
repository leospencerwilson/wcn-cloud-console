import { notFound } from "next/navigation";
import TabStrip from "@/components/tab-strip";
import { getCustomer } from "@/lib/db/customers";
import { statusPill } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CustomerLayout({ children, params }: Props) {
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const base = `/admin/customers/${slug}`;

  return (
    <div className="space-y-10">
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

      <TabStrip
        tabs={[
          { label: "Overview", href: base, exact: true },
          { label: "Coolify", href: `${base}/coolify` },
          { label: "Supabase", href: `${base}/supabase` },
          { label: "Health", href: `${base}/health` },
        ]}
      />

      <div>{children}</div>
    </div>
  );
}
