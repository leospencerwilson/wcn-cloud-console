import Link from "next/link";
import { requireCustomerAdmin } from "@/lib/auth/session";
import { getCustomer } from "@/lib/db/customers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomerAdmin();
  const slug = session.appUser.customer_slug!;
  const customer = await getCustomer(slug);
  const accent = "var(--color-navy)";

  return (
    <div className="min-h-screen flex flex-col">
      <div
        aria-hidden
        style={{
          height: 2,
          width: "100%",
          background: accent,
        }}
      />
      <header
        className="border-b-hairline border-b"
        style={{
          height: 56,
          background: "var(--color-ivory)",
          borderColor: "var(--color-hairline)",
        }}
      >
        <div className="mx-auto max-w-6xl px-6 h-full flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-4">
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
            <span className="type-eyebrow">
              § {customer?.name ?? "YOUR ENVIRONMENT"}
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <span
              className="font-mono text-[12px]"
              style={{ color: "var(--color-muted)" }}
            >
              {session.appUser.email}
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-12">
        {children}
      </main>
    </div>
  );
}
