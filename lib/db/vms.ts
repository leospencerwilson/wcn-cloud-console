import { query } from "./pool";

export type VmStatus = "reserving" | "active" | "suspended" | "destroyed";

export interface Vm {
  vmid: number;
  customer_slug: string;
  ip: string | null;
  tunnel_id: string | null;
  coolify_access_app_id: string | null;
  supabase_access_app_id: string | null;
  coolify_signing_token: string | null;
  status: VmStatus;
  proxmox_node: string | null;
  created_at: string;
  activated_at: string | null;
  last_updated_at: string | null;
  destroyed_at: string | null;
}

export async function getVmByCustomerSlug(slug: string): Promise<Vm | null> {
  const rows = await query<Vm>(
    `select vmid, customer_slug, ip, tunnel_id, coolify_access_app_id,
            supabase_access_app_id, coolify_signing_token, status, proxmox_node,
            created_at, activated_at, last_updated_at, destroyed_at
       from vms
      where customer_slug = $1 and status <> 'destroyed'
      order by created_at desc
      limit 1`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function listVmsByCustomer(slug: string): Promise<Vm[]> {
  return query<Vm>(
    `select vmid, customer_slug, ip, tunnel_id, coolify_access_app_id,
            supabase_access_app_id, coolify_signing_token, status, proxmox_node,
            created_at, activated_at, last_updated_at, destroyed_at
       from vms
      where customer_slug = $1
      order by created_at desc`,
    [slug],
  );
}
