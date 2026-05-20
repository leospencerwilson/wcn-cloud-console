import { query } from "./pool";

export type CustomerTier = "site" | "site-db" | "pro";
export type CustomerStatus =
  | "provisioning"
  | "active"
  | "suspended"
  | "deleted";

export interface Customer {
  slug: string;
  name: string;
  tier: CustomerTier;
  contact_email: string;
  brand_primary: string | null;
  brand_secondary: string | null;
  status: CustomerStatus;
  created_at: string;
  activated_at: string | null;
  deleted_at: string | null;
  notes: string | null;
  last_job_id: string | null;
}

export async function listCustomers(): Promise<Customer[]> {
  return query<Customer>(
    `select slug, name, tier, contact_email, brand_primary, brand_secondary,
            status, created_at, activated_at, deleted_at, notes, last_job_id
       from customers
      where deleted_at is null
      order by created_at desc`,
  );
}

export interface CustomerListRow extends Customer {
  vmid: number | null;
  ip: string | null;
  proxmox_node: string | null;
  vm_status: string | null;
}

// Joined view used by /admin/customers — includes the latest non-destroyed VM
// so we can render Host/IP/VM-status in one query rather than N+1.
export async function listCustomersWithVm(): Promise<CustomerListRow[]> {
  return query<CustomerListRow>(
    `select c.slug, c.name, c.tier, c.contact_email, c.brand_primary,
            c.brand_secondary, c.status, c.created_at, c.activated_at,
            c.deleted_at, c.notes, c.last_job_id,
            v.vmid, host(v.ip) as ip, v.proxmox_node,
            v.status::text as vm_status
       from customers c
       left join lateral (
         select vmid, ip, proxmox_node, status
           from vms
          where customer_slug = c.slug and status <> 'destroyed'
          order by created_at desc
          limit 1
       ) v on true
      where c.deleted_at is null
      order by c.created_at desc`,
  );
}

export async function getCustomer(slug: string): Promise<Customer | null> {
  const rows = await query<Customer>(
    `select slug, name, tier, contact_email, brand_primary, brand_secondary,
            status, created_at, activated_at, deleted_at, notes, last_job_id
       from customers
      where slug = $1`,
    [slug],
  );
  return rows[0] ?? null;
}

export interface CreateCustomerInput {
  slug: string;
  name: string;
  tier: CustomerTier;
  contactEmail: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const rows = await query<Customer>(
    `insert into customers (slug, name, tier, contact_email, status, created_at)
     values ($1, $2, $3, $4, 'provisioning', now())
     returning slug, name, tier, contact_email, brand_primary, brand_secondary,
               status, created_at, activated_at, deleted_at, notes, last_job_id`,
    [input.slug, input.name, input.tier, input.contactEmail],
  );
  if (!rows[0]) throw new Error("Insert failed");
  return rows[0];
}

export async function setLastJobId(slug: string, jobId: string): Promise<void> {
  await query(`update customers set last_job_id = $1 where slug = $2`, [jobId, slug]);
}

export async function writeAudit(
  actor: string,
  action: string,
  slug: string | null,
  details: Record<string, unknown>,
): Promise<void> {
  await query(
    `insert into audit_log (ts, actor, action, slug, details)
     values (now(), $1, $2, $3, $4)`,
    [actor, action, slug, JSON.stringify(details)],
  );
}

export interface AuditRow {
  id: string;
  ts: string;
  actor: string;
  action: string;
  slug: string | null;
  details: unknown;
}

export async function recentAudit(limit = 20): Promise<AuditRow[]> {
  return query<AuditRow>(
    `select id, ts, actor, action, slug, details
       from audit_log
      order by ts desc
      limit $1`,
    [limit],
  );
}
