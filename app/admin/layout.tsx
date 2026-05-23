import { requireWcnAdmin } from "@/lib/auth/session";
import AppShell from "@/components/shell/app-shell";
import Sidebar from "@/components/shell/sidebar";
import SignoutButton from "@/components/shell/signout-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireWcnAdmin();
  return (
    <AppShell
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
          footer={<SignoutButton />}
        />
      }
    >
      {children}
    </AppShell>
  );
}
