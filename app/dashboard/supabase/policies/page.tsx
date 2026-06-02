import { requireCustomerAdmin } from "@/lib/auth/session";
import SupabaseSectionStub from "../section-stub";

export const dynamic = "force-dynamic";

export default async function DashboardSupabasePoliciesPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studioUrl = `https://admin-${slug}.${rootDomain}`;
  return (
    <SupabaseSectionStub
      title="RLS policies"
      description="Inspect and edit Row-Level Security policies per table. Toggle RLS on/off, write new CREATE POLICY statements with a guided editor. Coming in a follow-up: this UI queries pg_policies and runs CREATE/DROP POLICY via your service-role role."
      studioPath="/auth/policies"
      studioUrl={studioUrl}
    />
  );
}
