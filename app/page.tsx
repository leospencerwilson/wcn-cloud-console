import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <p className="type-eyebrow mb-6">§ WCN CLOUD CONSOLE</p>
        <h1 className="type-h1 mb-6">WCN Cloud Console</h1>
        <p
          className="text-[15px] leading-[1.55] mb-10 max-w-md"
          style={{ color: "var(--color-muted)" }}
        >
          Multi-tenant infrastructure, signed-in access only.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button size="lg">Sign in</Button>
          </Link>
        </div>
        <div
          className="mt-16 pt-6 border-t-hairline border-t"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <p className="type-meta">
            Need access? Speak to your WCN contact about an invite.
          </p>
        </div>
      </div>
    </main>
  );
}
