import { requireCustomerAdmin } from "@/lib/auth/session";
import StorageView from "./storage-view";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseStoragePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <StorageView slug={slug} />;
}
