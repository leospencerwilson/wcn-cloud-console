import { Card } from "@/components/ui/card";
import { getInviteByToken } from "@/lib/db/invites";
import AcceptForm from "./accept-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  const now = new Date();
  const invalid =
    !invite || invite.used_at !== null || new Date(invite.expires_at) < now;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[440px]">
        <p className="type-eyebrow mb-6">§ ACTIVATE</p>
        {invalid ? (
          <>
            <h1 className="type-h1 mb-4">Invite invalid.</h1>
            <p
              className="text-[15px] leading-[1.55] mb-8"
              style={{ color: "var(--color-muted)" }}
            >
              This link is no longer valid. It may have expired or already been
              used. Speak to your WCN admin to be issued a new one.
            </p>
            <Card>
              <div className="px-8 py-7">
                <p className="type-meta">
                  Token <span className="type-mono">{token}</span>
                </p>
              </div>
            </Card>
          </>
        ) : (
          <>
            <h1 className="type-h1 mb-3">Set your password.</h1>
            <p
              className="text-[15px] leading-[1.55] mb-10"
              style={{ color: "var(--color-muted)" }}
            >
              Welcome to WCN Cloud. Choose a password to finish setting up your
              account.
            </p>
            <AcceptForm token={token} email={invite.email} />
          </>
        )}
      </div>
    </main>
  );
}
