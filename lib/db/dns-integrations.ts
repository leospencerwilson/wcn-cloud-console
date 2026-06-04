import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { query } from "./pool";

// AES-256-GCM at-rest encryption for DNS provider credentials.
// Same key + algorithm as the github_integrations helper so a single
// INTEGRATION_ENC_KEY env var protects every integration.
//
// Layout: base64( [12-byte IV][ciphertext][16-byte tag] )
// Stored in a TEXT column so it's easy to dump/restore through pg_dump.

const IV_BYTES = 12;
const TAG_BYTES = 16;

function key(): Buffer {
  const raw = process.env.INTEGRATION_ENC_KEY;
  if (!raw || raw.length < 16) {
    throw new Error(
      "INTEGRATION_ENC_KEY env var is missing or too short (need >=16 chars)",
    );
  }
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decryptJson<T = unknown>(b64: string): T {
  const blob = Buffer.from(b64, "base64");
  if (blob.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error("encrypted credentials blob too short");
  }
  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(blob.length - TAG_BYTES);
  const ct = blob.subarray(IV_BYTES, blob.length - TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const json = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  return JSON.parse(json) as T;
}

/* ── Row types ──────────────────────────────────────────────────────── */

export type DnsProvider = "cloudflare" | "route53" | "google" | "vercel" | "digitalocean";

export interface DnsZone {
  id: string;
  name: string;
  capabilities: { alias: boolean; cname_flattening: boolean };
}

export interface DnsIntegrationRow {
  id: string;
  customer_slug: string;
  provider: DnsProvider;
  display_name: string;
  zones_cache: DnsZone[];
  last_zone_sync_at: string | null;
  last_test_at: string | null;
  last_test_ok: boolean | null;
  last_test_error: string | null;
  created_at: string;
  created_by: string | null;
}

/* ── DB helpers ─────────────────────────────────────────────────────── */

export async function listIntegrations(slug: string): Promise<DnsIntegrationRow[]> {
  return query<DnsIntegrationRow>(
    `SELECT id::text, customer_slug, provider, display_name, zones_cache,
            last_zone_sync_at, last_test_at, last_test_ok, last_test_error,
            created_at, created_by
       FROM dns_integrations
      WHERE customer_slug = $1
      ORDER BY created_at ASC`,
    [slug],
  );
}

export async function getIntegration(
  slug: string,
  id: string,
): Promise<DnsIntegrationRow | null> {
  const rows = await query<DnsIntegrationRow>(
    `SELECT id::text, customer_slug, provider, display_name, zones_cache,
            last_zone_sync_at, last_test_at, last_test_ok, last_test_error,
            created_at, created_by
       FROM dns_integrations
      WHERE customer_slug = $1 AND id = $2
      LIMIT 1`,
    [slug, id],
  );
  return rows[0] ?? null;
}

export async function getIntegrationCredentials<T = unknown>(
  slug: string,
  id: string,
): Promise<T | null> {
  const rows = await query<{ encrypted_credentials: string }>(
    `SELECT encrypted_credentials FROM dns_integrations
      WHERE customer_slug = $1 AND id = $2 LIMIT 1`,
    [slug, id],
  );
  if (rows.length === 0) return null;
  return decryptJson<T>(rows[0].encrypted_credentials);
}

export async function createIntegration(args: {
  slug: string;
  provider: DnsProvider;
  display_name: string;
  credentials: unknown;
  created_by: string;
}): Promise<DnsIntegrationRow> {
  const rows = await query<DnsIntegrationRow>(
    `INSERT INTO dns_integrations (customer_slug, provider, display_name, encrypted_credentials, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id::text, customer_slug, provider, display_name, zones_cache,
               last_zone_sync_at, last_test_at, last_test_ok, last_test_error,
               created_at, created_by`,
    [args.slug, args.provider, args.display_name, encryptJson(args.credentials), args.created_by],
  );
  return rows[0];
}

export async function updateZonesCache(id: string, zones: DnsZone[]): Promise<void> {
  await query(
    `UPDATE dns_integrations
        SET zones_cache = $2::jsonb, last_zone_sync_at = now(), updated_at = now()
      WHERE id = $1`,
    [id, JSON.stringify(zones)],
  );
}

export async function recordTestResult(
  id: string,
  ok: boolean,
  error: string | null,
): Promise<void> {
  await query(
    `UPDATE dns_integrations
        SET last_test_at = now(), last_test_ok = $2, last_test_error = $3, updated_at = now()
      WHERE id = $1`,
    [id, ok, error],
  );
}

export async function deleteIntegration(slug: string, id: string): Promise<void> {
  await query(
    `DELETE FROM dns_integrations WHERE customer_slug = $1 AND id = $2`,
    [slug, id],
  );
}
