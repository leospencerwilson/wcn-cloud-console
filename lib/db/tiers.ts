import { query } from "./pool";

export interface Tier {
  id: string;
  display_name: string;
  vcpu: number;
  ram_mb: number;
  disk_gb: number;
  price_gbp_monthly: number;
  backup_cadence: string;
  sla: string;
  features: Record<string, unknown>;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

const SELECT_COLS = `id, display_name, vcpu, ram_mb, disk_gb, price_gbp_monthly,
                     backup_cadence, sla, features, archived,
                     created_at, updated_at`;

export async function listTiers(
  opts: { includeArchived?: boolean } = {},
): Promise<Tier[]> {
  const includeArchived = opts.includeArchived ?? false;
  if (includeArchived) {
    return query<Tier>(
      `select ${SELECT_COLS} from tiers order by price_gbp_monthly asc, id asc`,
    );
  }
  return query<Tier>(
    `select ${SELECT_COLS} from tiers
      where archived = false
      order by price_gbp_monthly asc, id asc`,
  );
}

export async function getTier(id: string): Promise<Tier | null> {
  const rows = await query<Tier>(
    `select ${SELECT_COLS} from tiers where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface CreateTierInput {
  id: string;
  display_name: string;
  vcpu: number;
  ram_mb: number;
  disk_gb: number;
  price_gbp_monthly: number;
  backup_cadence?: string;
  sla?: string;
  features?: Record<string, unknown>;
}

export async function createTier(input: CreateTierInput): Promise<Tier> {
  const rows = await query<Tier>(
    `insert into tiers
       (id, display_name, vcpu, ram_mb, disk_gb, price_gbp_monthly,
        backup_cadence, sla, features)
     values ($1, $2, $3, $4, $5, $6,
             coalesce($7, 'nightly'), coalesce($8, 'best-effort'),
             coalesce($9::jsonb, '{}'::jsonb))
     returning ${SELECT_COLS}`,
    [
      input.id,
      input.display_name,
      input.vcpu,
      input.ram_mb,
      input.disk_gb,
      input.price_gbp_monthly,
      input.backup_cadence ?? null,
      input.sla ?? null,
      input.features ? JSON.stringify(input.features) : null,
    ],
  );
  if (!rows[0]) throw new Error("Insert failed");
  return rows[0];
}

export interface UpdateTierPatch {
  display_name?: string;
  vcpu?: number;
  ram_mb?: number;
  disk_gb?: number;
  price_gbp_monthly?: number;
  backup_cadence?: string;
  sla?: string;
  features?: Record<string, unknown>;
}

export async function updateTier(id: string, patch: UpdateTierPatch): Promise<Tier> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  const push = (col: string, val: unknown) => {
    sets.push(`${col} = $${i++}`);
    params.push(val);
  };
  if (patch.display_name !== undefined) push("display_name", patch.display_name);
  if (patch.vcpu !== undefined) push("vcpu", patch.vcpu);
  if (patch.ram_mb !== undefined) push("ram_mb", patch.ram_mb);
  if (patch.disk_gb !== undefined) push("disk_gb", patch.disk_gb);
  if (patch.price_gbp_monthly !== undefined)
    push("price_gbp_monthly", patch.price_gbp_monthly);
  if (patch.backup_cadence !== undefined) push("backup_cadence", patch.backup_cadence);
  if (patch.sla !== undefined) push("sla", patch.sla);
  if (patch.features !== undefined) {
    sets.push(`features = $${i++}::jsonb`);
    params.push(JSON.stringify(patch.features));
  }
  if (sets.length === 0) {
    const current = await getTier(id);
    if (!current) throw new Error(`Tier "${id}" not found`);
    return current;
  }
  sets.push(`updated_at = now()`);
  params.push(id);
  const rows = await query<Tier>(
    `update tiers set ${sets.join(", ")} where id = $${i} returning ${SELECT_COLS}`,
    params,
  );
  if (!rows[0]) throw new Error(`Tier "${id}" not found`);
  return rows[0];
}

export async function archiveTier(id: string): Promise<Tier> {
  const rows = await query<Tier>(
    `update tiers set archived = true, updated_at = now()
      where id = $1
     returning ${SELECT_COLS}`,
    [id],
  );
  if (!rows[0]) throw new Error(`Tier "${id}" not found`);
  return rows[0];
}

export async function countCustomersOnTier(id: string): Promise<number> {
  const rows = await query<{ n: string }>(
    `select count(*)::text as n from customers
      where tier = $1 and deleted_at is null`,
    [id],
  );
  return Number(rows[0]?.n ?? 0);
}
