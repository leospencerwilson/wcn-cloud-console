import Link from "next/link";
import { requireWcnAdmin } from "@/lib/auth/session";
import AdminSubnav from "@/components/admin-subnav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireWcnAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="border-b-hairline border-b"
        style={{
          height: 56,
          background: "var(--color-ivory)",
          borderColor: "var(--color-hairline)",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 h-full flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-4">
            <span
              className="font-display italic font-semibold text-[20px] tracking-[-0.02em]"
              style={{ color: "var(--color-navy)" }}
            >
              WCN
            </span>
            <span
              className="h-5 w-px"
              style={{ background: "var(--color-hairline)" }}
              aria-hidden
            />
            <span className="type-eyebrow">§ WCN CLOUD</span>
          </Link>
          <div className="flex items-center gap-5">
            <span className="font-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              {session.appUser.email}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="btn btn-ghost btn-sm"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <AdminSubnav />
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-12">
        {children}
      </main>
    </div>
  );
}
