import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireWcnAdmin } from "@/lib/auth/session";
import { listTiers, type Tier } from "@/lib/db/tiers";
import { query } from "@/lib/db/pool";
import { statusPill } from "@/lib/utils";

interface CustomerCountRow {
  tier: string;
  n: string;
}

async function customerCountsByTier(): Promise<Record<string, number>> {
  const rows = await query<CustomerCountRow>(
    `select tier, count(*)::text as n
       from customers
      where deleted_at is null
      group by tier`,
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.tier] = Number(r.n);
  return out;
}

function PlusIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function fmtGbp(pence: number): string {
  return `£${pence}`;
}

function fmtRam(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

export default async function TiersPage() {
  await requireWcnAdmin();
  const [tiers, counts] = await Promise.all([
    listTiers({ includeArchived: true }),
    customerCountsByTier(),
  ]);

  return (
    <div className="space-y-14">
      <header>
        <p className="type-eyebrow">§ TIERS</p>
      </header>

      <Card>
        <div className="px-8 py-6">
          <div className="flex justify-end mb-6">
            <Link href="/admin/tiers/new">
              <Button>
                <PlusIcon />
                New tier
              </Button>
            </Link>
          </div>
          {tiers.length === 0 ? (
            <p className="type-meta py-8">No tiers defined yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Name</th>
                  <th>vCPU</th>
                  <th>RAM</th>
                  <th>Disk</th>
                  <th>Price/mo</th>
                  <th>Backup</th>
                  <th>SLA</th>
                  <th>Customers</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t: Tier) => {
                  const n = counts[t.id] ?? 0;
                  const statusKey = t.archived ? "deleted" : "active";
                  const label = t.archived ? "archived" : "active";
                  return (
                    <tr key={t.id}>
                      <td className="type-mono">{t.id}</td>
                      <td>{t.display_name}</td>
                      <td className="type-mono">{t.vcpu}</td>
                      <td className="type-mono">{fmtRam(t.ram_mb)}</td>
                      <td className="type-mono">{t.disk_gb} GB</td>
                      <td className="type-mono">{fmtGbp(t.price_gbp_monthly)}</td>
                      <td className="type-mono" style={{ color: "var(--color-muted)" }}>
                        {t.backup_cadence}
                      </td>
                      <td className="type-mono" style={{ color: "var(--color-muted)" }}>
                        {t.sla}
                      </td>
                      <td className="type-mono">{n}</td>
                      <td>
                        <span className={statusPill(statusKey)}>{label}</span>
                      </td>
                      <td>
                        <Link href={`/admin/tiers/${encodeURIComponent(t.id)}`}>
                          <Button variant="secondary" size="sm">
                            <EditIcon />
                            Edit
                          </Button>
                        </Link>
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
