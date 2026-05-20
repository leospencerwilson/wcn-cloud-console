import Link from "next/link";
import TabStrip from "@/components/tab-strip";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { statusPill } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const customer = await getCustomer(slug);
  const accent = "var(--color-navy)";

  return (
    <div className="min-h-screen flex flex-col">
      <div
        aria-hidden
        style={{
          height: 2,
          width: "100%",
          background: accent,
        }}
      />
      <header
        className="border-b-hairline border-b"
        style={{
          height: 56,
          background: "var(--color-ivory)",
          borderColor: "var(--color-hairline)",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 h-full flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-4">
            <span
              className="font-display italic font-semibold text-[20px] tracking-[-0.02em]"
              style={{ color: "var(--color-navy)" }}
            >
              WCN
            </span>
            <span
              className="h-5 w-px"
              style={{ background: "var(--color-hairline)" }}
              aria-hidden
            />
            <span className="type-eyebrow">
              § {customer?.name ?? "YOUR ENVIRONMENT"}
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <span
              className="font-mono text-[12px]"
              style={{ color: "var(--color-muted)" }}
            >
              {session.appUser.email}
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-12">
        {customer ? (
          <div className="space-y-10">
            <div>
              <p className="type-eyebrow mb-5">§ YOUR ENVIRONMENT</p>
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
                <span className={statusPill(customer.status)}>
                  {customer.status}
                </span>
              </p>
            </div>
            <TabStrip
              tabs={[
                { label: "Overview", href: "/dashboard", exact: true },
                { label: "Coolify", href: "/dashboard/coolify" },
                { label: "Supabase", href: "/dashboard/supabase" },
                { label: "Health", href: "/dashboard/health" },
              ]}
            />
            <div>{children}</div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
