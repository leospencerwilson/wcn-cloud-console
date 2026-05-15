import Link from "next/link";
import Image from "next/image";
import { requireCustomerAdmin } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomerAdmin();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/brand/wordmark.svg"
              alt="WCN Cloud"
              width={160}
              height={32}
            />
          </Link>
          <div className="text-sm text-neutral-600">
            <span className="font-medium">{session.appUser.email}</span>
            <span className="text-neutral-400"> · </span>
            <form action="/api/auth/logout" method="post" className="inline">
              <button
                type="submit"
                className="text-brand-navy hover:underline"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
