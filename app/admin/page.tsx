import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCustomers, recentAudit } from "@/lib/db/customers";
import { countAppUsers } from "@/lib/db/users";
import { countPendingInvites } from "@/lib/db/invites";

export default async function AdminHome() {
  const [customers, userCount, pendingInvites, audit] = await Promise.all([
    listCustomers(),
    countAppUsers(),
    countPendingInvites(),
    recentAudit(15),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-archivo text-3xl font-semibold text-brand-navy">
        Admin overview
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Customers" value={customers.length} href="/admin/customers" />
        <Stat label="Active users" value={userCount} href="/admin/customers" />
        <Stat label="Pending invites" value={pendingInvites} href="/admin/invites" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit log</CardTitle>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-sm text-neutral-500">No audit events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Slug</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} className="border-t border-neutral-100">
                    <td className="py-2 pr-4 font-space-grotesk text-xs text-neutral-600">
                      {new Date(row.ts).toISOString()}
                    </td>
                    <td className="py-2 pr-4">{row.actor}</td>
                    <td className="py-2 pr-4 font-space-grotesk text-xs">
                      {row.action}
                    </td>
                    <td className="py-2 pr-4 font-space-grotesk text-xs">
                      {row.slug ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-brand-navy transition">
        <CardContent className="py-6">
          <div className="text-sm text-neutral-500">{label}</div>
          <div className="mt-2 font-archivo text-3xl font-semibold text-brand-navy">
            {value}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
