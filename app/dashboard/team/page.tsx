import { requireCustomerAdmin } from "@/lib/auth/session";
import TeamManager from "./team-manager";

export const dynamic = "force-dynamic";

export default async function DashboardTeamPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">Team</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          Invite teammates and assign roles. Invite links expire after 7 days.
        </p>
      </div>
      <TeamManager slug={slug} currentEmail={session.appUser.email} />
    </div>
  );
}
