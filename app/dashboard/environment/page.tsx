import { requireCustomerAdmin } from "@/lib/auth/session";
import EnvironmentOverview from "./environment-overview";

export const dynamic = "force-dynamic";

export default async function DashboardEnvironmentPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">Environment</h2>
        <p
          className="mt-2 text-[13px]"
          style={{ color: "var(--text-3)" }}
        >
          Every environment variable across every app in this environment.
          Search, audit, and reveal values. To edit, jump into the app that owns
          the variable.
        </p>
      </div>
      <EnvironmentOverview slug={slug} />
    </div>
  );
}
