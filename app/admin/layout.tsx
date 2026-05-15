import Link from "next/link";
import Image from "next/image";
import { requireWcnAdmin } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireWcnAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-brand-navy text-white">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <Image
              src="/brand/logo.svg"
              alt="WCN Cloud"
              width={32}
              height={32}
            />
            <span className="font-archivo text-lg">Console · Admin</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="hover:text-brand-mint">
              Overview
            </Link>
            <Link href="/admin/customers" className="hover:text-brand-mint">
              Customers
            </Link>
            <Link href="/admin/invites" className="hover:text-brand-mint">
              Invites
            </Link>
            <span className="text-white/70">{session.appUser.email}</span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="hover:text-brand-mint">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
