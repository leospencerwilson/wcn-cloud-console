import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import AppOverview from "./app-overview";

export const dynamic = "force-dynamic";

export default async function DashboardAppOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  const app = await provisionerApps.apps.get(id, slug);
  return <AppOverview slug={slug} app={app} />;
}
