import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __wcnOpsPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__wcnOpsPool) {
    const url = process.env.OPS_DB_URL;
    if (!url) {
      throw new Error("OPS_DB_URL is not set");
    }
    global.__wcnOpsPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return global.__wcnOpsPool;
}

export async function query<T = unknown>(
  text: string,
  params: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query<T>(text, params as unknown[]);
  return res.rows;
}
