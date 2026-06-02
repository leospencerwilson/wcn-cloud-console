import { requireCustomerAdmin } from "@/lib/auth/session";
import SupabaseSectionStub from "../section-stub";

export const dynamic = "force-dynamic";

export default async function DashboardSupabaseAuthPage() {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const studioUrl = `https://admin-${slug}.${rootDomain}`;
  return (
    <SupabaseSectionStub
      title="Authentication"
      description="Manage your end-users — list, invite, edit, disable, delete. Configure auth providers (email, OAuth, magic link, OTP), JWT settings, and the redirect allow-list. Coming in a follow-up: this UI calls Kong's /auth/v1/admin/users with your service-role key."
      studioPath="/auth/users"
      studioUrl={studioUrl}
    />
  );
}
