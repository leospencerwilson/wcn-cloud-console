import { requireCustomerAdmin } from "@/lib/auth/session";
import HealthPanel from "@/app/admin/customers/[slug]/health/health-panel";

export default async function DashboardHealthPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const apex = `${slug}.${rootDomain}`;
  return <HealthPanel apex={apex} />;
}
