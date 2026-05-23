import { requireCustomerAdmin } from "@/lib/auth/session";
import DatabaseExplorer from "./database-explorer";

export const dynamic = "force-dynamic";

export default async function DashboardDatabasePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">Database</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--text-3)" }}>
          Browse schemas, inspect columns, and run queries against this
          environment&apos;s Supabase Postgres. Statements run with a 30 s
          server-side timeout.
        </p>
      </div>
      <DatabaseExplorer slug={slug} />
    </div>
  );
}
