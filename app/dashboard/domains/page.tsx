import { requireCustomerAdmin } from "@/lib/auth/session";
import DomainsOverview from "./domains-overview";

export const dynamic = "force-dynamic";

// Index tab — the existing per-customer domains overview. PageHeader +
// tab strip live in the shared layout above this.
export default async function DashboardDomainsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <DomainsOverview slug={slug} />;
}
