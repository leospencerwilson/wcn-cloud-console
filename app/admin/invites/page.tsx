import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listInvites } from "@/lib/db/invites";

export default async function InvitesPage() {
  const invites = await listInvites();
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-archivo text-3xl font-semibold text-brand-navy">
          Invites
        </h1>
        <Link href="/admin/invites/new">
          <Button>New invite</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500 bg-neutral-50">
              <tr>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expires</th>
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    No invites yet.
                  </td>
                </tr>
              ) : (
                invites.map((inv) => {
                  const expired = new Date(inv.expires_at) < now;
                  const status = inv.used_at
                    ? "used"
                    : expired
                      ? "expired"
                      : "pending";
                  return (
                    <tr key={inv.id} className="border-t border-neutral-100">
                      <td className="py-3 px-4">{inv.email}</td>
                      <td className="py-3 px-4 font-space-grotesk text-xs">
                        {inv.role}
                      </td>
                      <td className="py-3 px-4 font-space-grotesk text-xs">
                        {inv.customer_slug ?? "—"}
                      </td>
                      <td className="py-3 px-4">{status}</td>
                      <td className="py-3 px-4 font-space-grotesk text-xs text-neutral-600">
                        {new Date(inv.expires_at).toISOString().slice(0, 16)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
