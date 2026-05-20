import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/db/customers";
import HealthPanel from "./health-panel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CustomerHealthPage({ params }: PageProps) {
  const { slug } = await params;
  const customer = await getCustomer(slug);
  if (!customer) notFound();

  const apex = `${customer.slug}.western-communication.com`;
  return <HealthPanel apex={apex} />;
}
