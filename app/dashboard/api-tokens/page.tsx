import { requireCustomerAdmin } from "@/lib/auth/session";
import TokensManager from "./tokens-manager";

export const dynamic = "force-dynamic";

export default async function DashboardTokensPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="type-h2">API tokens</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-muted)" }}>
          Tokens authenticate machine-to-machine calls. Scopes restrict what each
          token can do. The plaintext token is shown <strong>once</strong> at
          creation and never again.
        </p>
      </div>
      <TokensManager slug={slug} currentEmail={session.appUser.email} />
    </div>
  );
}
