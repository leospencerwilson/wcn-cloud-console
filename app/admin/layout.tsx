import { requireWcnAdmin } from "@/lib/auth/session";
import AppShell from "@/components/shell/app-shell";
import Sidebar from "@/components/shell/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireWcnAdmin();
  return (
    <AppShell
      variant="admin"
      sidebar={
        <Sidebar
          variant="admin"
          switcher={{
            shortLabel: "WC",
            primary: "Administrator",
            secondary: "Fleet-wide access",
            tone: "brand",
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
