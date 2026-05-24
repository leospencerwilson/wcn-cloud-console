import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import EnvEditor from "./env-editor";

export const dynamic = "force-dynamic";

export default async function DashboardAppEnvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  const env = await provisionerApps.env.get(id, slug);
  return <EnvEditor slug={slug} appId={id} initial={env} />;
}
