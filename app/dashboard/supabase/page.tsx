import { notFound } from "next/navigation";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import { PageHeader } from "@/components/page-header";
import ConnectionCard from "./connection-card";
import SchemaBrowser from "./schema-browser";

export const dynamic = "force-dynamic";

export default async function DashboardSupabasePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studio = `https://admin-${slug}.${rootDomain}`;
  const tierHasSupabase = customer.tier !== "site";

  if (!tierHasSupabase) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Supabase"
          title="Supabase"
          subtitle="Your managed Postgres and authentication backend."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Supabase"
        title="Supabase"
        subtitle="Your managed Postgres and authentication backend."
      />

      <ConnectionCard slug={slug} />

      <div
        className="grid"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 380px)",
          gap: 24,
          alignItems: "start",
        }}
      >
        <SchemaBrowser slug={slug} />

        <section className="surface-card" style={{ padding: "18px 22px" }}>
          <div className="type-h3" style={{ marginBottom: 6 }}>
            Supabase Studio
          </div>
          <p
            className="text-[13px]"
            style={{ color: "var(--text-3)", marginBottom: 14 }}
          >
            Full Supabase UI for auth users, edge functions, storage buckets,
            realtime channels, and RLS policies.
          </p>
          <a
            href={studio}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              display: "inline-flex",
              padding: "8px 14px",
              fontSize: 12.5,
              textDecoration: "none",
            }}
          >
            Open Studio ↗
          </a>
          <div
            className="type-mono"
            style={{
              fontSize: 11,
              color: "var(--text-4)",
              marginTop: 14,
              wordBreak: "break-all",
            }}
          >
            {studio.replace(/^https?:\/\//, "")}
          </div>
          <div
            className="type-mono"
            style={{ fontSize: 10.5, color: "var(--text-4)", marginTop: 4 }}
          >
            SSO via WCN console
          </div>
        </section>
      </div>
    </div>
  );
}
