import { requireCustomerAdmin } from "@/lib/auth/session";
import RealtimeView from "./realtime-view";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseRealtimePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <RealtimeView slug={slug} />;
}
