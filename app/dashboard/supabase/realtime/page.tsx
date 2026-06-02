import { requireCustomerAdmin } from "@/lib/auth/session";
import SupabaseSectionStub from "../section-stub";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseRealtimePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studioUrl = `https://admin-${slug}.${rootDomain}`;
  return (
    <SupabaseSectionStub
      title="Realtime"
      description="Inspect realtime channels and active subscribers. Toggle publish-time replication for individual tables and configure broadcast / presence channels. Coming in a follow-up: this UI inspects Postgres replication slots and proxies Kong's /realtime/v1/* admin endpoints."
      studioPath="/database/replication"
      studioUrl={studioUrl}
    />
  );
}
