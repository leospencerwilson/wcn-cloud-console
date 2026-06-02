import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import EnvEditor from "./env-editor";
import SecretsManager from "../secrets/secrets-manager";

export const dynamic = "force-dynamic";

// Environment + Secrets share this view — both are app-scoped key/value
// stores and the user thinks of them together. The Secrets tab is removed
// from the layout's TabStrip; legacy /secrets URLs redirect here.
export default async function DashboardAppEnvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  const env = await provisionerApps.env.get(id, slug);
  return (
    <div className="space-y-8">
      <EnvEditor slug={slug} appId={id} initial={env} />
      <SecretsManager slug={slug} appId={id} />
    </div>
  );
}
