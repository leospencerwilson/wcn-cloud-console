import { notFound } from "next/navigation";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { PageHeader } from "@/components/page-header";
import { IconExternal } from "@/components/ui/icons";
import ServerCard from "./server-card";
import WebhookOverview from "./webhook-overview";
import EnvOverview from "./env-overview";
import CronOverview from "./cron-overview";

export const dynamic = "force-dynamic";

export default async function DashboardCoolifyPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const upstream = `https://admin-${slug}.${rootDomain}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coolify"
        title="Coolify"
        subtitle="Your self-hosted deployment platform."
        actions={
          <a
            href={upstream}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost type-mono"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            <IconExternal />
            Open Coolify
          </a>
        }
      />

      <ServerCard slug={slug} />
      <WebhookOverview slug={slug} />
      <EnvOverview slug={slug} />
      <CronOverview slug={slug} />
    </div>
  );
}
