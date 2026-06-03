import { notFound } from "next/navigation";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import TabStrip from "@/components/tab-strip";
import { PageHeader } from "@/components/page-header";
import { IconExternal } from "@/components/ui/icons";

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

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studioUrl = `https://db-${slug}.${rootDomain}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          eyebrow="Supabase"
          title="Supabase"
          subtitle="Tables, auth, storage, realtime, functions, RLS policies, and connection details for your managed Supabase instance."
        />
        <div className="vm-action-group" role="group" aria-label="Open Studio" style={{ marginTop: 6 }}>
          <a
            href={studioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="vm-action vm-action--view"
            title="Open the upstream Supabase Studio for this project in a new tab"
          >
            <IconExternal />
            <span>Open in Studio</span>
          </a>
        </div>
      </div>
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
