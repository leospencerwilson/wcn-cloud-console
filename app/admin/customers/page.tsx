import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listCustomersWithVm, type CustomerListRow } from "@/lib/db/customers";
import { statusPill } from "@/lib/utils";

// Hit https://SLUG.western-communication.com/healthz; 1.5s timeout.
// Returns "online" | "offline" | "rebooting" | "unknown".
async function heartbeat(slug: string): Promise<string> {
  const url = `https://${slug}.western-communication.com/healthz`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "manual",
    });
    clearTimeout(t);
    if (res.ok) return "online";
    // Cloudflare 503/502 while booting/restarting reads as rebooting.
    if (res.status === 502 || res.status === 503) return "rebooting";
    return "offline";
  } catch {
    return "offline";
  }
}

function liveDot(state: string) {
  if (state === "online") return { cls: "dot dot-online", label: "Online" };
  if (state === "rebooting") return { cls: "dot dot-rebooting", label: "Rebooting" };
  if (state === "offline") return { cls: "dot dot-offline", label: "Offline" };
  return { cls: "dot", label: "Unknown" };
}

export default async function CustomersPage() {
  const customers = await listCustomersWithVm();

  // Fan out heartbeat checks in parallel; settle so a single slow VM doesn't
  // block the whole page render.
  const states = await Promise.all(
    customers.map((c) =>
      c.status === "deleted" || c.status === "provisioning"
        ? Promise.resolve("unknown")
        : heartbeat(c.slug),
    ),
  );

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
            Every customer currently on WCN Cloud. Click a row for details.
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
                  <th>Live</th>
                  <th>Slug</th>
                  <th>Name</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Host</th>
                  <th>Contact</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: CustomerListRow, i: number) => {
                  const dot = liveDot(states[i]);
                  return (
                    <tr
                      key={c.slug}
                      className="cursor-pointer hover:bg-[rgba(7,14,116,0.03)]"
                    >
                      <td>
                        <Link
                          href={`/admin/customers/${c.slug}`}
                          className="block w-full"
                          aria-label={`${c.name} — ${dot.label}`}
                        >
                          <span className={dot.cls} title={dot.label} />
                        </Link>
                      </td>
                      <td className="type-mono">
                        <Link href={`/admin/customers/${c.slug}`}>{c.slug}</Link>
                      </td>
                      <td>
                        <Link href={`/admin/customers/${c.slug}`}>{c.name}</Link>
                      </td>
                      <td className="type-mono">{c.tier}</td>
                      <td>
                        <span className={statusPill(c.status)}>{c.status}</span>
                      </td>
                      <td
                        className="type-mono"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {c.proxmox_node ?? "—"}
                      </td>
                      <td>{c.contact_email}</td>
                      <td
                        className="type-mono"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {new Date(c.created_at).toISOString().slice(0, 10)}
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
