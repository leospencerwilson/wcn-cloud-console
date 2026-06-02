import { requireCustomerAdmin } from "@/lib/auth/session";
import AuthView from "./auth-view";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseAuthPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <AuthView slug={slug} />;
}
