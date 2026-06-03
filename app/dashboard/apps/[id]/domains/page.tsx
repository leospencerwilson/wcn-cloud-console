import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps, ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import DomainsManager from "./domains-manager";

export const dynamic = "force-dynamic";

export default async function DashboardAppDomainsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;

  let initial: Awaited<ReturnType<typeof provisionerApps.domains.list>> = [];
  let loadError: string | null = null;
  try {
    initial = await provisionerApps.domains.list(id, slug);
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      loadError = `${err.status} ${err.message}`;
    } else {
      loadError = err instanceof Error ? err.message : "unreachable";
    }
  }

  return (
    <div className="space-y-6">
      <DomainsManager
        slug={slug}
        appId={id}
        initial={initial}
        loadError={loadError}
      />
    </div>
  );
}
