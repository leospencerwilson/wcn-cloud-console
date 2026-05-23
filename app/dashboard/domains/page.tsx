import { requireCustomerAdmin } from "@/lib/auth/session";
import DomainsOverview from "./domains-overview";

export const dynamic = "force-dynamic";

export default async function DashboardDomainsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">Domains</h2>
        <p
          className="mt-2 text-[13px]"
          style={{ color: "var(--text-3)" }}
        >
          Every custom hostname across every app in this environment. Add new
          domains, watch them go live, and jump to the app that owns each one.
        </p>
      </div>
      <DomainsOverview slug={slug} />
    </div>
  );
}
