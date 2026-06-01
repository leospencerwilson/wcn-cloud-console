import { query } from "./pool";
import type { AuditRow } from "./customers";

export interface ListAuditOptions {
  slug?: string | null;
  actor?: string | null;
  action?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}

export interface ListAuditResult {
  rows: AuditRow[];
  total: number;
  page: number;
  limit: number;
}

export async function listAudit(opts: ListAuditOptions): Promise<ListAuditResult> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 25)));
  const sort = opts.sort === "asc" ? "asc" : "desc";

  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: (i: number) => string, v: unknown) => {
    params.push(v);
    where.push(sql(params.length));
  };

  if (opts.slug) add((i) => `slug = $${i}`, opts.slug);
  if (opts.actor) add((i) => `actor ilike $${i}`, `%${opts.actor}%`);
  if (opts.action) add((i) => `action ilike $${i}`, `%${opts.action}%`);
  if (opts.q) {
    add(
      (i) => `(actor ilike $${i} or action ilike $${i} or coalesce(slug,'') ilike $${i})`,
      `%${opts.q}%`,
    );
  }
  if (opts.from) add((i) => `ts >= $${i}`, opts.from);
  if (opts.to) add((i) => `ts <= $${i}`, opts.to);

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const offset = (page - 1) * limit;

  const rows = await query<AuditRow>(
    `select id, ts, actor, action, slug, details
       from audit_log
       ${whereSql}
       order by ts ${sort}
       limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, limit, offset],
  );

  const totalRows = await query<{ count: string }>(
    `select count(*)::text as count from audit_log ${whereSql}`,
    params,
  );
  const total = Number(totalRows[0]?.count ?? 0);

  return { rows, total, page, limit };
}
