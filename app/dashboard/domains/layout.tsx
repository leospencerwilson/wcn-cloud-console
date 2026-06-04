import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import TabStrip from "@/components/tab-strip";

export const dynamic = "force-dynamic";

// Tabbed shell for /dashboard/domains. Pre-existing "Domains" overview is
// the index tab; "DNS providers" is the new auto-config feature. Both are
// rendered as children — neither file needs its own PageHeader anymore.
export default async function DashboardDomainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCustomerAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Domains"
        title="Domains"
        subtitle="Custom hostnames mapped to your apps, plus the DNS providers we'll auto-configure CNAMEs on."
      />
      <TabStrip
        tabs={[
          { label: "Domains", href: "/dashboard/domains", exact: true },
          { label: "DNS providers", href: "/dashboard/domains/dns-providers" },
        ]}
      />
      <div>{children}</div>
    </div>
  );
}
