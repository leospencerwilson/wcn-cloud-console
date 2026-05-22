import { requireCustomerAdmin } from "@/lib/auth/session";
import ExecConsole from "./exec-console";

export const dynamic = "force-dynamic";

export default async function ExecConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  return <ExecConsole slug={slug} appId={id} />;
}
