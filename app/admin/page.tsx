import { Card } from "@/components/ui/card";
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
    <div className="space-y-14">
      <header>
        <p className="type-eyebrow mb-5">§ OVERVIEW</p>
        <h1 className="type-h1">Fleet, at a glance.</h1>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Stat label="Customers" value={customers.length} delay={0} />
        <Stat label="Active users" value={userCount} delay={80} />
        <Stat label="Pending invites" value={pendingInvites} delay={160} />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="type-h2">— AUDIT TRAIL</h2>
          <span className="type-meta">Most recent 15 events</span>
        </div>
        <Card>
          <div className="px-8 py-6">
            {audit.length === 0 ? (
              <p className="type-meta">No events recorded yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Slug</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((row) => (
                    <tr key={row.id}>
                      <td className="type-mono" style={{ color: "var(--color-muted)" }}>
                        {new Date(row.ts).toISOString()}
                      </td>
                      <td>{row.actor}</td>
                      <td className="type-mono">{row.action}</td>
                      <td className="type-mono">{row.slug ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <div className="fade-rise" style={{ animationDelay: `${delay}ms` }}>
      <Card>
        <div className="px-8 py-8">
          <p className="type-eyebrow mb-6">— {label.toUpperCase()}</p>
          <div className="type-marquee">{value}</div>
          <p className="type-meta mt-4">{label}</p>
        </div>
      </Card>
    </div>
  );
}
