import { notFound } from "next/navigation";
import { getPublicStatus } from "@/lib/provisioner/public-status";
import StatusView from "./status-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicStatus(slug).catch(() => null);
  if (!data) return { title: "Status" };
  return {
    title: `${data.customer.name} — Status`,
    description: `Live service status for ${data.customer.name}.`,
    robots: { index: true, follow: true },
  };
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicStatus(slug);
  if (!data) notFound();
  return <StatusView initial={data} />;
}
