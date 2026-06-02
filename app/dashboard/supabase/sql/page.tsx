import { requireCustomerAdmin } from "@/lib/auth/session";
import SqlEditor from "./sql-editor";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseSqlPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <SqlEditor slug={slug} />;
}
