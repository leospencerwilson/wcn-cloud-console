import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import LoginForm from "./login-form";
import CircuitField from "@/components/circuit-field";

// Mirror of safeNext() in login-form.tsx — restrict cross-host redirects
// to our own root domain so /login?next= can never be turned into an
// open redirector. Runs server-side because the auto-redirect for
// already-signed-in users happens before the form renders.
function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname === "western-communication.com") return url.toString();
    if (url.hostname.endsWith(".western-communication.com")) return url.toString();
  } catch {
    /* not a URL */
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const session = await getSession();
  if (session) {
    // Honour next= when present — otherwise the user clicks Open in
    // Studio (or another cross-host link), Caddy's forward_auth bounces
    // them through /login?next=…, and we end up looping back to the
    // dashboard instead of taking them where they were going.
    if (next) {
      redirect(next);
    }
    redirect(session.appUser.role === "wcn_admin" ? "/admin" : "/dashboard");
  }
  return (
    <main className="relative overflow-hidden min-h-screen flex items-center justify-center px-6 py-16">
      <CircuitField />
      <div className="relative z-10 w-full max-w-md space-y-12">
        <header>
          <p className="type-eyebrow mb-5">§ SIGN IN</p>
          <h1 className="type-h1 mb-3">Welcome back.</h1>
          <p
            className="text-[15px] leading-[1.55] max-w-xl"
            style={{ color: "var(--color-muted)" }}
          >
            Sign in to your WCN Cloud Console.
          </p>
        </header>

        <Card>
          <div className="px-8 py-8">
            <LoginForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
