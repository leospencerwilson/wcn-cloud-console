"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type State =
  | { kind: "accepting" }
  | { kind: "success"; slug: string; role: string }
  | { kind: "error"; code: string; message: string };

function explain(code: string, fallback: string): string {
  switch (code) {
    case "not_found":
      return "This invite doesn't exist. The link may be wrong or already used.";
    case "invite_revoked":
      return "This invite was revoked by an admin before you accepted it.";
    case "invite_expired":
      return "This invite has expired (invites last 7 days). Ask for a new one.";
    case "already_accepted":
      return "This invite has already been accepted.";
    case "email_mismatch":
      return "You're signed in with the wrong account for this invite.";
    default:
      return fallback;
  }
}

export default function AcceptInvite({
  token,
  signedInEmail,
}: {
  token: string;
  signedInEmail: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "accepting" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/team/invites/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          customer_slug?: string;
          role?: string;
        };
        if (!alive) return;
        if (!res.ok) {
          setState({
            kind: "error",
            code: data.code || "http_error",
            message: data.error || `HTTP ${res.status}`,
          });
          return;
        }
        setState({
          kind: "success",
          slug: data.customer_slug || "",
          role: data.role || "viewer",
        });
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch (e) {
        if (!alive) return;
        setState({
          kind: "error",
          code: "network",
          message: e instanceof Error ? e.message : "Network error",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, router]);

  if (state.kind === "accepting") {
    return (
      <div className="space-y-3">
        <h1 className="type-h2">Accepting invite…</h1>
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          Signed in as {signedInEmail}.
        </p>
      </div>
    );
  }
  if (state.kind === "success") {
    return (
      <div className="space-y-3">
        <h1 className="type-h2">Welcome to {state.slug}!</h1>
        <p
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          You joined as <strong>{state.role}</strong>. Redirecting to your
          dashboard…
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <h1 className="type-h2">Couldn&apos;t accept invite</h1>
      <p
        className="px-3 py-2 type-mono text-[12px]"
        style={{
          color: "var(--color-danger, #b03020)",
          border: "1px solid var(--color-danger, #b03020)",
          borderRadius: 2,
        }}
      >
        {explain(state.code, state.message)}
      </p>
      <p
        className="type-mono text-[11px]"
        style={{ color: "var(--color-muted)" }}
      >
        Signed in as {signedInEmail}.
      </p>
    </div>
  );
}
