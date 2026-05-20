import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getCustomer } from "@/lib/db/customers";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomerCoolifyPage({ params }: PageProps) {
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const url = `https://admin-${customer.slug}.western-communication.com`;

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">— COOLIFY</h2>
        <span className="type-meta">Apps and deployments dashboard</span>
      </div>
      <Card>
        <div className="px-8 py-8 space-y-5">
          <p
            className="text-[15px] leading-[1.55]"
            style={{ color: "var(--color-muted)" }}
          >
            Custom in-console Coolify UI lands here. For now, open the upstream
            dashboard.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="type-mono text-[13px]"
            style={{ color: "var(--color-navy)" }}
          >
            {url.replace(/^https?:\/\//, "")} ↗
          </a>
        </div>
      </Card>
    </div>
  );
}
