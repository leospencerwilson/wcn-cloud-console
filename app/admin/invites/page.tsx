import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listInvites } from "@/lib/db/invites";

function pillFor(status: string) {
  if (status === "pending") return "pill pill-pending";
  if (status === "expired") return "pill pill-expired";
  if (status === "used") return "pill pill-used";
  return "pill";
}

export default async function InvitesPage() {
  const invites = await listInvites();
  const now = new Date();

  return (
    <div className="space-y-14">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="type-eyebrow mb-5">§ ACCESS</p>
          <h1 className="type-h1">Pending invites.</h1>
        </div>
        <Link href="/admin/invites/new">
          <Button>Send invite</Button>
        </Link>
      </header>

      <Card>
        <div className="px-8 py-6">
          {invites.length === 0 ? (
            <p className="type-meta py-8">
              No pending invites. All sent tokens have either been accepted or
              expired.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => {
                  const expired = new Date(inv.expires_at) < now;
                  const status = inv.used_at
                    ? "used"
                    : expired
                      ? "expired"
                      : "pending";
                  return (
                    <tr key={inv.id}>
                      <td>{inv.email}</td>
                      <td className="type-mono">{inv.role}</td>
                      <td className="type-mono">{inv.customer_slug ?? "—"}</td>
                      <td>
                        <span className={pillFor(status)}>{status}</span>
                      </td>
                      <td className="type-mono" style={{ color: "var(--color-muted)" }}>
                        {new Date(inv.expires_at).toISOString().slice(0, 16)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
