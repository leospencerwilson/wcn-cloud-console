import { requireCustomerAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import TokensManager from "./tokens-manager";

export const dynamic = "force-dynamic";

export default async function DashboardTokensPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access"
        title="API tokens"
        subtitle="Programmatic access to the WCN Cloud API."
      />
      <TokensManager slug={slug} currentEmail={session.appUser.email} />
    </div>
  );
}
