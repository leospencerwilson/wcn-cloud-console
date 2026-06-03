import { requireCustomerAdmin } from "@/lib/auth/session";
import MigrationWizard from "./migration-wizard";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseMigratePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <MigrationWizard slug={slug} />;
}
