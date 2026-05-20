import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";

export default async function DashboardSupabasePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studio = `https://studio.${slug}.${rootDomain}`;
  const api = `https://api.${slug}.${rootDomain}`;
  const tierHasSupabase = customer.tier !== "site";

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">— SUPABASE</h2>
        <span className="type-meta">Database, auth, storage</span>
      </div>
      <Card>
        <div className="px-8 py-8 space-y-6">
          {tierHasSupabase ? (
            <>
              <p
                className="text-[15px] leading-[1.55]"
                style={{ color: "var(--color-muted)" }}
              >
                A native Supabase experience inside this console is on its way.
                For now, open the upstream surfaces.
              </p>
              <ul className="space-y-3">
                <li>
                  <a
                    href={studio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="type-mono text-[13px]"
                    style={{ color: "var(--color-navy)" }}
                  >
                    {studio.replace(/^https?:\/\//, "")} ↗
                  </a>
                  <div className="type-meta mt-1">Studio</div>
                </li>
                <li>
                  <a
                    href={api}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="type-mono text-[13px]"
                    style={{ color: "var(--color-navy)" }}
                  >
                    {api.replace(/^https?:\/\//, "")} ↗
                  </a>
                  <div className="type-meta mt-1">
                    Kong (PostgREST / Auth / Storage)
                  </div>
                </li>
              </ul>
            </>
          ) : (
            <p className="type-meta">
              Your plan (<strong>site</strong> tier) does not include a Supabase
              stack. Contact WCN if you need database services.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
