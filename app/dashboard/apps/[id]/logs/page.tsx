import { requireCustomerAdmin } from "@/lib/auth/session";
import RuntimeLogsView from "./runtime-logs-view";

export const dynamic = "force-dynamic";

export default async function RuntimeLogsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  return <RuntimeLogsView slug={slug} appId={id} />;
}
