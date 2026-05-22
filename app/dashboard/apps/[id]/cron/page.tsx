import { requireCustomerAdmin } from "@/lib/auth/session";
import CronManager from "./cron-manager";

export const dynamic = "force-dynamic";

export default async function CronPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  return <CronManager slug={slug} appId={id} />;
}
