import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCustomer } from "@/lib/db/customers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomerSupabasePage({ params }: PageProps) {
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const studio = `https://db-${customer.slug}.western-communication.com`;
  const api = `https://api-${customer.slug}.western-communication.com`;

  const tierHasSupabase = customer.tier !== "site";

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">§ SUPABASE</h2>
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
                Custom in-console Supabase UI lands here. For now, open the
                upstream surfaces.
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
              This customer is on the <strong>site</strong> tier — no Supabase
              stack provisioned.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
