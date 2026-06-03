import Link from "next/link";
import { notFound } from "next/navigation";
import TabStrip from "@/components/tab-strip";
import { Card } from "@/components/ui/card";
import { IconExternal } from "@/components/ui/icons";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps, ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import { statusPill } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;

  let app;
  try {
    app = await provisionerApps.apps.get(id, slug);
  } catch (err) {
    if (err instanceof ProvisionerHttpError && err.status === 404) {
      notFound();
    }
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/apps"
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          ← Apps
        </Link>
        <Card>
          <div className="px-8 py-8 space-y-3">
            <p className="type-eyebrow">§ COULD NOT LOAD APP</p>
            <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              {err instanceof Error ? err.message : "unreachable"}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/apps"
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          ← Apps
        </Link>
        <div className="mt-3 flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <h2 className="type-h2">{app.name}</h2>
            <p
              className="mt-2 text-[13px] flex flex-wrap items-center gap-x-3 gap-y-1"
              style={{ color: "var(--color-muted)" }}
            >
              <span className={statusPill(app.status)}>{app.status}</span>
              <span aria-hidden>·</span>
              <span className="type-mono">{app.source_type}</span>
              {app.source_repo && (
                <>
                  <span aria-hidden>·</span>
                  <span className="type-mono">{app.source_repo}</span>
                </>
              )}
              {app.docker_image && (
                <>
                  <span aria-hidden>·</span>
                  <span className="type-mono">{app.docker_image}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Standard URL — visible on every app sub-tab, sits above the
          tabstrip so customers always have the canonical link to hand */}
      {(() => {
        const standardUrl = `https://${app.name}.${slug}.western-communication.com`;
        return (
          <Card>
            <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-1 min-w-0">
                <p className="type-eyebrow" style={{ color: "var(--text-3)" }}>§ STANDARD URL</p>
                <a
                  href={standardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="type-mono"
                  style={{
                    color: "var(--accent)",
                    fontSize: 14,
                    textDecoration: "none",
                    wordBreak: "break-all",
                  }}
                >
                  {standardUrl}
                </a>
              </div>
              <div className="vm-action-group" role="group" aria-label="Open">
                <a
                  href={standardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vm-action vm-action--view"
                >
                  <IconExternal />
                  <span>Open</span>
                </a>
              </div>
            </div>
          </Card>
        );
      })()}

      <TabStrip
        tabs={[
          { label: "Overview", href: `/dashboard/apps/${id}`, exact: true },
          { label: "Metrics", href: `/dashboard/apps/${id}/metrics` },
          { label: "Logs", href: `/dashboard/apps/${id}/logs` },
          { label: "Cron", href: `/dashboard/apps/${id}/cron` },
          { label: "Console", href: `/dashboard/apps/${id}/console` },
          { label: "Environment", href: `/dashboard/apps/${id}/env` },
          { label: "Domains", href: `/dashboard/apps/${id}/domains` },
          { label: "Deploy", href: `/dashboard/apps/${id}/deploy` },
        ]}
      />

      <div>{children}</div>
    </div>
  );
}
