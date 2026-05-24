import { requireCustomerAdmin } from "@/lib/auth/session";
import { provisionerApps, ProvisionerHttpError } from "@/lib/provisioner/apps-client";
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
  let app;
  try {
    app = await provisionerApps.apps.get(id, slug);
  } catch (err) {
    const message =
      err instanceof ProvisionerHttpError
        ? `${err.status} ${err.message}`
        : err instanceof Error
          ? err.message
          : "unreachable";
    return (
      <section className="surface-card" style={{ padding: "20px 22px" }}>
        <p
          className="type-eyebrow"
          style={{ color: "var(--crit)", marginBottom: 8 }}
        >
          § APP TEMPORARILY UNAVAILABLE
        </p>
        <p style={{ fontSize: 13.5, color: "var(--text-2)", marginBottom: 6 }}>
          The provisioner couldn&apos;t load this app right now. The Coolify
          backend often returns a transient error during an in-flight deploy.
          The app itself is unaffected — wait a moment and reload.
        </p>
        <p className="type-mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>
          {message}
        </p>
      </section>
    );
  }
  return <AppOverview slug={slug} app={app} />;
}
