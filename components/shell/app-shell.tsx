import type { ReactNode } from "react";
import CommandPalette from "./command-palette";
import TerminalDrawer from "./terminal-drawer";
import UserBadge from "./user-badge";

export default function AppShell({
  variant,
  sidebar,
  topbar,
  userEmail,
  children,
}: {
  variant: "admin" | "customer";
  sidebar: ReactNode;
  topbar?: ReactNode;
  userEmail?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--sidebar-w) 1fr",
        flex: 1,
        minHeight: 0,
        background:
          "radial-gradient(1200px 600px at 80% -10%, color-mix(in oklch, var(--brand) 8%, transparent), transparent 60%), var(--bg)",
      }}
    >
      {sidebar}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {topbar}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            scrollBehavior: "smooth",
          }}
        >
          <div
            style={{
              maxWidth: 1380,
              margin: "0 auto",
              padding: "24px 32px",
            }}
          >
            {children}
          </div>
        </div>
      </main>
      <CommandPalette variant={variant} />
      <TerminalDrawer />
      {userEmail && <UserBadge email={userEmail} />}
    </div>
  );
}
