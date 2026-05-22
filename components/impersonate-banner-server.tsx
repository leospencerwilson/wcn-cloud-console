import { getSession } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import ImpersonateBanner from "./impersonate-banner";

export default async function ImpersonateBannerServer() {
  const session = await getSession();
  if (!session?.impersonating) return null;
  const customer = await getCustomer(session.impersonating.customer_slug);
  return (
    <ImpersonateBanner
      customerName={customer?.name ?? session.impersonating.customer_slug}
      customerSlug={session.impersonating.customer_slug}
      startedAt={session.impersonating.started_at}
      note={session.impersonating.note}
    />
  );
}
