import Image from "next/image";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.appUser.role === "wcn_admin" ? "/admin" : "/dashboard");
  }
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Image
            src="/brand/wordmark.svg"
            alt="WCN Cloud"
            width={220}
            height={48}
            priority
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Log in</CardTitle>
            <CardDescription>
              Sign in to the WCN Cloud Console with your email and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
