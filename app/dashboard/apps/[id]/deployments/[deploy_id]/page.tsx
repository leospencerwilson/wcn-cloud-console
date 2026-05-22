import Link from "next/link";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import DeployLogView from "./deploy-log-view";

export const dynamic = "force-dynamic";

export default async function DeployLogPage({
  params,
}: {
  params: Promise<{ id: string; deploy_id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id, deploy_id } = await params;

  let deployment;
  try {
    const all = await provisionerApps.apps.deployments(id);
    deployment = all.find((d) => d.deployment_uuid === deploy_id) ?? null;
  } catch {
    deployment = null;
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/apps/${id}`}
        className="type-mono text-[12px]"
        style={{ color: "var(--color-muted)" }}
      >
        ← Overview
      </Link>
      <DeployLogView
        slug={slug}
        appId={id}
        deployId={deploy_id}
        initialStatus={deployment?.status ?? "pending"}
        startedAt={deployment?.started_at ?? null}
        finishedAt={deployment?.finished_at ?? null}
      />
    </div>
  );
}
