import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listCustomers } from "@/lib/db/customers";

function statusPill(status: string) {
  const key = status.toLowerCase();
  if (key === "active") return "pill pill-active";
  if (key === "provisioning") return "pill pill-provisioning";
  if (key === "deleted") return "pill pill-deleted";
  if (key === "pending") return "pill pill-pending";
  return "pill pill-used";
}

export default async function CustomersPage() {
  const customers = await listCustomers();
  return (
    <div className="space-y-14">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="type-eyebrow mb-5">§ FLEET</p>
          <h1 className="type-h1 mb-3">Active deployments.</h1>
          <p
            className="text-[15px] leading-[1.55] max-w-xl"
            style={{ color: "var(--color-muted)" }}
          >
            Every customer currently on WCN Cloud.
          </p>
        </div>
        <Link href="/admin/customers/new">
          <Button>Create customer</Button>
        </Link>
      </header>

      <Card>
        <div className="px-8 py-6">
          {customers.length === 0 ? (
            <p className="type-meta py-8">
              No customers yet. The orchestrator will populate this list once a
              deployment completes.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Name</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.slug}>
                    <td className="type-mono">{c.slug}</td>
                    <td>{c.name}</td>
                    <td className="type-mono">{c.tier}</td>
                    <td>
                      <span className={statusPill(c.status)}>{c.status}</span>
                    </td>
                    <td>{c.contact_email}</td>
                    <td className="type-mono" style={{ color: "var(--color-muted)" }}>
                      {new Date(c.created_at).toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
