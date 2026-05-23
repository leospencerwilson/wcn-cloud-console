import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";
import AppShell from "@/components/shell/app-shell";
import Sidebar from "@/components/shell/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const customer = await getCustomer(slug);
  const shortLabel = (customer?.name ?? slug).slice(0, 3).toUpperCase();

  return (
    <AppShell
      variant="customer"
      userEmail={session.appUser.email}
      sidebar={
        <Sidebar
          variant="customer"
          switcher={{
            shortLabel,
            primary: customer?.name ?? slug,
            secondary: `${slug} · ${customer?.tier ?? "—"}`,
            tone: "accent",
          }}
          user={{ email: session.appUser.email }}
          showFooter={false}
        />
      }
    >
      {children}
    </AppShell>
  );
}
