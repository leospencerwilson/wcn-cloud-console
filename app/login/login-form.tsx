"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { IconLogIn } from "@/components/ui/icons";

// Allow post-login redirects only to *.western-communication.com (any scheme
// normalised to https) or relative same-origin paths. Anything else falls
// through to the role-based default so we don't become an open redirector.
function safeNext(raw: string | null): string | null {
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

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError("That didn't work — check the email and password and try again.");
        return;
      }
      const res = await fetch("/api/auth/login", { method: "POST" });
      if (!res.ok) {
        setError("Signed in, but session setup failed. Try again.");
        return;
      }
      const data = (await res.json()) as { role: "wcn_admin" | "customer_admin" };
      if (next) {
        // Cross-host redirects need a real navigation, not router.push.
        if (next.startsWith("http")) {
          window.location.assign(next);
          return;
        }
        router.push(next);
      } else {
        router.push(data.role === "wcn_admin" ? "/admin" : "/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      {error && (
        <div
          className="px-4 py-3 text-[13px] leading-[1.5] border type-mono"
          role="alert"
          style={{
            color: "var(--color-danger, #b3261e)",
            borderColor: "var(--color-danger, #b3261e)",
            background: "var(--color-danger-bg, #fdecea)",
          }}
        >
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          disabled={loading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner />
              Signing in…
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <IconLogIn />
              Sign in
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
