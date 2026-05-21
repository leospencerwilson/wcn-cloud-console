import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import { statusPill } from "@/lib/utils";
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

function fmtSource(a: App): string {
  if (a.source_type === "git") {
    return `${a.source_repo ?? "—"} (${a.source_branch || "main"})`;
  }
  if (a.source_type === "dockerimage") return a.docker_image ?? "—";
  return a.source_repo ?? "—";
}

export default async function DashboardAppsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const result = await safeList(slug);

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">— APPLICATIONS</h2>
        <Link href="/dashboard/apps/new" className="btn btn-primary btn-sm">
          + New app
        </Link>
      </div>

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
              Create your first app
            </Link>
          </div>
        </Card>
      )}

      {result.ok && result.apps.length > 0 && (
        <Card>
          <div className="px-2 py-2">
            <table className="w-full text-[14px]">
              <thead>
                <tr style={{ color: "var(--color-muted)" }}>
                  <th className="text-left px-6 py-3 type-eyebrow">Name</th>
                  <th className="text-left px-6 py-3 type-eyebrow">Source</th>
                  <th className="text-left px-6 py-3 type-eyebrow">Status</th>
                  <th className="text-left px-6 py-3 type-eyebrow">Last deploy</th>
                </tr>
              </thead>
              <tbody>
                {result.apps.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t"
                    style={{ borderColor: "var(--color-hairline)" }}
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/apps/${a.id}`}
                        className="font-medium"
                        style={{ color: "var(--color-navy)" }}
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
                      {fmtSource(a)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={statusPill(a.status)}>{a.status}</span>
                    </td>
                    <td className="px-6 py-4 type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
                      {a.last_deploy_at
                        ? new Date(a.last_deploy_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
