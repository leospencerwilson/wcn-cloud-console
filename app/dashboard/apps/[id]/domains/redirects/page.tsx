import Link from "next/link";
import { requireCustomerAdmin } from "@/lib/auth/session";
import RedirectsManager from "./redirects-manager";

export const dynamic = "force-dynamic";

export default async function RedirectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const { id } = await params;
  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/apps/${id}/domains`}
        className="type-mono text-[12px]"
        style={{ color: "var(--color-muted)" }}
      >
        ← Domains
      </Link>
      <RedirectsManager slug={slug} appId={id} />
    </div>
  );
}
