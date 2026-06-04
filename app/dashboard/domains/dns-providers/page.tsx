import { requireCustomerAdmin } from "@/lib/auth/session";
import DnsProvidersManager from "./dns-providers-manager";

export const dynamic = "force-dynamic";

export default async function DnsProvidersPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return <DnsProvidersManager slug={slug} userEmail={session.appUser.email} />;
}
