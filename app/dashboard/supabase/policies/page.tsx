import { requireCustomerAdmin } from "@/lib/auth/session";
import PoliciesView from "./policies-view";

export const dynamic = "force-dynamic";

export default async function DashboardSupabasePoliciesPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <PoliciesView slug={slug} />;
}
