import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.appUser.role === "wcn_admin" ? "/admin" : "/dashboard");
  }
  return (
    <main className="min-h-screen flex">
      <aside
        className="hidden md:flex md:w-1/2 lg:w-5/12 relative login-grid"
        style={{ background: "var(--color-navy)", color: "var(--color-ivory)" }}
      >
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <p
              className="font-sans text-[11px] font-medium uppercase tracking-[0.16em]"
              style={{ color: "rgba(250, 247, 242, 0.6)" }}
            >
              § WCN CLOUD CONSOLE
            </p>
          </div>
          <div className="leading-none">
            <div
              className="font-display italic font-semibold leading-[0.9] tracking-[-0.03em]"
              style={{ fontSize: "clamp(120px, 16vw, 200px)" }}
            >
              <div>W</div>
              <div>C</div>
              <div>N</div>
            </div>
          </div>
          <div>
            <p
              className="font-sans text-[12px] font-medium leading-[1.5] max-w-xs"
              style={{ color: "rgba(250, 247, 242, 0.7)" }}
            >
              Multi-tenant infrastructure for Western Communication and its
              customers. Engineered, racked, and operated in-house.
            </p>
          </div>
        </div>
      </aside>
      <section className="flex-1 flex items-center px-6 md:px-16">
        <div className="w-full max-w-[380px]">
          <p className="type-eyebrow mb-6">§ SIGN IN</p>
          <h1 className="type-h1 mb-3">Welcome back.</h1>
          <p
            className="text-[15px] leading-[1.55] mb-10"
            style={{ color: "var(--color-muted)" }}
          >
            Sign in to manage your environment.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
