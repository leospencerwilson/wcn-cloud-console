import { notFound } from "next/navigation";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
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
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h2 className="type-h2">Coolify</h2>
          <p
            className="mt-2 text-[13px]"
            style={{ color: "var(--text-3)" }}
          >
            Server health, push-to-deploy webhooks, environment, and scheduled
            tasks across every app in this environment.
          </p>
        </div>
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
          Open Coolify ↗
        </a>
      </div>

      <ServerCard slug={slug} />
      <WebhookOverview slug={slug} />
      <EnvOverview slug={slug} />
      <CronOverview slug={slug} />
    </div>
  );
}
