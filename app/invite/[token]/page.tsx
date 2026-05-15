import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    !invite ||
    invite.used_at !== null ||
    new Date(invite.expires_at) < now;

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
          {invalid ? (
            <>
              <CardHeader>
                <CardTitle>Invite invalid</CardTitle>
                <CardDescription>
                  This invite link is no longer valid. It may have expired or
                  already been used. Please contact your WCN admin for a new
                  invite.
                </CardDescription>
              </CardHeader>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Accept your invite</CardTitle>
                <CardDescription>
                  Set a password for <strong>{invite.email}</strong> to finish
                  creating your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AcceptForm token={token} email={invite.email} />
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
