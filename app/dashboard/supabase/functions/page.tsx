import { requireCustomerAdmin } from "@/lib/auth/session";
import FunctionsView from "./functions-view";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseFunctionsPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studioUrl = `https://admin-${slug}.${rootDomain}`;
  return <FunctionsView slug={slug} studioUrl={studioUrl} />;
}
