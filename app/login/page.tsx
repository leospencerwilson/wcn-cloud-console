import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import LoginForm from "./login-form";
import CircuitField from "@/components/circuit-field";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
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
