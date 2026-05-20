import { Card } from "@/components/ui/card";
import { requireCustomerAdmin } from "@/lib/auth/session";

export default async function DashboardCoolifyPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const url = `https://coolify.${slug}.${rootDomain}`;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">— COOLIFY</h2>
        <span className="type-meta">Apps and deployments dashboard</span>
      </div>
      <Card>
        <div className="px-8 py-8 space-y-5">
          <p
            className="text-[15px] leading-[1.55]"
            style={{ color: "var(--color-muted)" }}
          >
            A native Coolify experience inside this console is on its way. For
            now, open the upstream dashboard.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="type-mono text-[13px]"
            style={{ color: "var(--color-navy)" }}
          >
            {url.replace(/^https?:\/\//, "")} ↗
          </a>
        </div>
      </Card>
    </div>
  );
}
