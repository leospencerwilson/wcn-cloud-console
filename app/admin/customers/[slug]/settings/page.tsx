import { notFound } from "next/navigation";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import IdentityForm from "./identity-form";
import BillingForm from "./billing-form";
import DangerZone from "./danger-zone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CustomerSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireWcnAdmin();
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const archived = customer.status === "archived";

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="type-eyebrow">§ IDENTITY</p>
        <IdentityForm
          slug={slug}
          initial={{
            name: customer.name,
            tier: customer.tier,
            contact_email: customer.contact_email,
          }}
        />
      </section>

      <section className="space-y-3">
        <p className="type-eyebrow">§ BILLING</p>
        <BillingForm
          slug={slug}
          initial={{
            billing_contact_name: customer.billing_contact_name ?? "",
            billing_contact_email: customer.billing_contact_email ?? "",
            technical_contact_name: customer.technical_contact_name ?? "",
            technical_contact_email: customer.technical_contact_email ?? "",
            billing_address: customer.billing_address ?? "",
            vat_number: customer.vat_number ?? "",
            go_live_date: customer.go_live_date ?? "",
            notes: customer.notes ?? "",
          }}
        />
      </section>

      <section className="space-y-3">
        <p className="type-eyebrow">§ OPERATIONAL</p>
        <Card>
          <CardHeader>
            <CardTitle>Operational</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className="type-mono text-[12px]"
              style={{ color: "var(--color-muted)" }}
            >
              More settings coming soon.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <p className="type-eyebrow">§ DANGER ZONE</p>
        <DangerZone slug={slug} archived={archived} />
      </section>
    </div>
  );
}
