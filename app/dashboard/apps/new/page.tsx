import { requireCustomerAdmin } from "@/lib/auth/session";
import NewAppForm from "./new-app-form";

export const dynamic = "force-dynamic";

export default async function DashboardNewAppPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <NewAppForm slug={slug} />;
}
