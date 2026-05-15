import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-br from-white to-neutral-100">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <Image
            src="/brand/wordmark.svg"
            alt="WCN Cloud"
            width={280}
            height={64}
            priority
          />
        </div>
        <div className="space-y-3">
          <h1 className="font-archivo text-4xl font-semibold text-brand-navy">
            WCN Cloud Console
          </h1>
          <p className="text-neutral-600">
            Self-service management for your WCN Cloud environment — projects,
            databases, domains, and team.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/login">
            <Button size="lg">Log in</Button>
          </Link>
        </div>
        <p className="text-xs text-neutral-500 pt-8">
          Need an account? Ask your WCN contact for an invite.
        </p>
      </div>
    </main>
  );
}
