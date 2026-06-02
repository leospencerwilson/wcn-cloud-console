import { requireCustomerAdmin } from "@/lib/auth/session";
import SchemaBrowser from "./schema-browser";

export const dynamic = "force-dynamic";

// Index of the Supabase area = Tables tab.
// The full schema/table browser already lives in schema-browser.tsx; the
// layout supplies the page header + tab strip, so this page just renders
// the browser.
export default async function DashboardSupabaseTablesPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <SchemaBrowser slug={slug} />;
}
