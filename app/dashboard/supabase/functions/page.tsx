import { requireCustomerAdmin } from "@/lib/auth/session";
import SupabaseSectionStub from "../section-stub";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseFunctionsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studioUrl = `https://admin-${slug}.${rootDomain}`;
  return (
    <SupabaseSectionStub
      title="Edge Functions"
      description="Deploy, list, and inspect logs for Deno-based edge functions. View per-invocation traces and configure secrets. Coming in a follow-up: this UI proxies Kong's /functions/v1/* admin endpoints."
      studioPath="/functions"
      studioUrl={studioUrl}
    />
  );
}
