import { requireCustomerAdmin } from "@/lib/auth/session";
import TableEditor from "./table-editor";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseTablesPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <TableEditor slug={slug} />;
}
