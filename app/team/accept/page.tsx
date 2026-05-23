import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import AcceptInvite from "./accept-invite";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await getSession();
  if (!session) {
    const ret = encodeURIComponent(`/team/accept?token=${token ?? ""}`);
    redirect(`/login?return_to=${ret}`);
  }
  if (!token) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 space-y-3">
        <h1 className="type-h2">Invalid invite link</h1>
        <p className="text-[13px]" style={{ color: "var(--color-muted)" }}>
          The link is missing its token. Ask the inviter to share it again.
        </p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <AcceptInvite token={token} signedInEmail={session.appUser.email} />
    </main>
  );
}
