import { requireCustomerAdmin } from "@/lib/auth/session";
import SecretsManager from "./secrets-manager";

export const dynamic = "force-dynamic";

export default async function SecretsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  return <SecretsManager slug={slug} appId={id} />;
}
