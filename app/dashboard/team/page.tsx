import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import TeamManager from "./team-manager";

export const dynamic = "force-dynamic";

export default async function DashboardTeamPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Team"
        subtitle="People with access to your console."
      />
      <TeamManager slug={slug} currentEmail={session.appUser.email} />
    </div>
  );
}
