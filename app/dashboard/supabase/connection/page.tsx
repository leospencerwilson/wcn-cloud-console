import { requireCustomerAdmin } from "@/lib/auth/session";
import ConnectionCard from "../connection-card";

export const dynamic = "force-dynamic";

// Connection details: DB URL, REST endpoint, anon key, service-role key,
// Studio link. Existing `ConnectionCard` already covers it — wrap so it
// renders inside the tabbed layout.
export default async function DashboardSupabaseConnectionPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <ConnectionCard slug={slug} />;
}
