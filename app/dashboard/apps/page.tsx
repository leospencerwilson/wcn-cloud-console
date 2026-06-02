import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconPlus } from "@/components/ui/icons";
import { PageHeader } from "@/components/page-header";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import AppsTable from "./apps-table";
import type { App } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";

async function safeList(slug: string): Promise<
  { ok: true; apps: App[] } | { ok: false; reason: string }
> {
  try {
    return { ok: true, apps: await provisionerApps.apps.list(slug) };
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      return { ok: false, reason: `${err.status} ${err.message}` };
    }
    return { ok: false, reason: err instanceof Error ? err.message : "unreachable" };
  }
}

export default async function DashboardAppsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const result = await safeList(slug);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Apps"
        title="Deployed apps"
        subtitle="Applications running in your environment."
        actions={
          <Link href="/dashboard/apps/new" className="btn btn-primary btn-sm">
            <IconPlus />
            New app
          </Link>
        }
      />

      {!result.ok && (
        <Card>
          <div className="px-8 py-8 space-y-3">
            <p className="type-eyebrow">§ PROVISIONER UNREACHABLE</p>
            <p
              className="text-[15px] leading-[1.55]"
              style={{ color: "var(--color-muted)" }}
            >
              The app-management API isn&apos;t responding yet. This is expected
              if the provisioner hasn&apos;t been deployed with the
              <span className="type-mono"> /apps/* </span>routes yet.
            </p>
            <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              {result.reason}
            </p>
          </div>
        </Card>
      )}

      {result.ok && result.apps.length === 0 && (
        <Card>
          <div className="px-8 py-10 text-center space-y-4">
            <p className="type-eyebrow">§ NO APPLICATIONS YET</p>
            <p
              className="text-[15px] leading-[1.55]"
              style={{ color: "var(--color-muted)" }}
            >
              Deploy your first application from a Git repository, Dockerfile,
              or container image.
            </p>
            <Link href="/dashboard/apps/new" className="btn btn-primary">
              <IconPlus />
              Create your first app
            </Link>
          </div>
        </Card>
      )}

      {result.ok && result.apps.length > 0 && (
        <AppsTable slug={slug} apps={result.apps} />
      )}
    </div>
  );
}
