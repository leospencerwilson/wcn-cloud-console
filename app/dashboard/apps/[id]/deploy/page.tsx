import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerWebhooks } from "@/lib/provisioner/webhook-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import type { AppWebhookConfig } from "@/lib/provisioner/types";
import DeployManager from "./deploy-manager";

export const dynamic = "force-dynamic";

export default async function DashboardAppDeployPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;

  let initial: AppWebhookConfig = { configured: false };
  let loadError: string | null = null;
  try {
    initial = await provisionerWebhooks.get(id, slug);
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      loadError = `${err.status} ${err.message}`;
    } else {
      loadError = err instanceof Error ? err.message : "unreachable";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">Push-to-deploy</h2>
        <p
          className="mt-2 text-[13px]"
          style={{ color: "var(--text-3)" }}
        >
          Trigger a deploy automatically when GitHub pushes to a branch. The
          webhook URL and secret are unique to this app; rotate by deleting and
          recreating.
        </p>
      </div>
      <DeployManager
        slug={slug}
        appId={id}
        initial={initial}
        loadError={loadError}
      />
    </div>
  );
}
