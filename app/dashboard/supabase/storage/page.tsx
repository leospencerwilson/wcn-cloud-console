import { requireCustomerAdmin } from "@/lib/auth/session";
import SupabaseSectionStub from "../section-stub";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseStoragePage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studioUrl = `https://admin-${slug}.${rootDomain}`;
  return (
    <SupabaseSectionStub
      title="Storage"
      description="Browse and manage storage buckets and objects. Upload, download, set bucket-level policies, generate signed URLs. Coming in a follow-up: this UI calls Kong's /storage/v1/* with your service-role key."
      studioPath="/storage/buckets"
      studioUrl={studioUrl}
    />
  );
}
