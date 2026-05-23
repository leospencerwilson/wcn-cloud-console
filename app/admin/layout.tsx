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
      userEmail={session.appUser.email}
      sidebar={
        <Sidebar
          variant="admin"
          switcher={{
            shortLabel: "OPS",
            primary: "WCN Cloud · admin",
            secondary: "fleet operations",
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
