import { notFound } from "next/navigation";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import TabStrip from "@/components/tab-strip";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

// Tabbed shell for the customer Supabase UI. Each tab is a child route under
// /dashboard/supabase/*. Tables is the index. Auth / Storage / Realtime /
// Functions / Policies are scaffolded — they'll be filled out in follow-up
// sessions as we add the matching provisioner endpoints.
//
// The `site` tier doesn't include Supabase. Block all child routes here so
// none of them tries to read non-existent connection data.
export default async function DashboardSupabaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  if (customer.tier === "site") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Supabase"
          title="Supabase"
          subtitle="Your plan doesn't include a managed Postgres + auth backend. Upgrade to Site + DB or Pro to enable this tab."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Supabase"
        title="Supabase"
        subtitle="Tables, auth, storage, realtime, functions, RLS policies, and connection details for your managed Supabase instance."
      />
      <TabStrip
        tabs={[
          { label: "Tables", href: "/dashboard/supabase", exact: true },
          { label: "SQL Editor", href: "/dashboard/supabase/sql" },
          { label: "Authentication", href: "/dashboard/supabase/auth" },
          { label: "Storage", href: "/dashboard/supabase/storage" },
          { label: "Realtime", href: "/dashboard/supabase/realtime" },
          { label: "Functions", href: "/dashboard/supabase/functions" },
          { label: "Policies", href: "/dashboard/supabase/policies" },
          { label: "Connection", href: "/dashboard/supabase/connection" },
        ]}
      />
      <div>{children}</div>
    </div>
  );
}
