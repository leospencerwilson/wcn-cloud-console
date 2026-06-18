import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/db/customers";
import HealthPanel from "./health-panel";
import { CustomerHealthPanel } from "@/components/customer-health-panel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomerHealthPage({ params }: PageProps) {
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const apex = `${customer.slug}.western-communication.com`;
  return (
    <div className="space-y-8">
      <HealthPanel apex={apex} />
      <div className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="type-h2">§ COMPONENTS</h2>
          <span className="type-meta">DNS · tunnel · VM networking · services — checked server-side</span>
        </div>
        <CustomerHealthPanel slug={customer.slug} />
      </div>
    </div>
  );
}
