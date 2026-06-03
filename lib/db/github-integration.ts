import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { query } from "./pool";

// AES-256-GCM at-rest encryption for OAuth access tokens.
//
// Layout (single bytea column): [12-byte IV][N-byte ciphertext][16-byte tag]
//
// Key derivation: SHA-256(INTEGRATION_ENC_KEY) so we accept any string of any
// length as the env var and always end up with a 256-bit key.

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

export function encryptToken(plain: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]);
}

export function decryptToken(blob: Buffer): string {
  if (blob.length < IV_BYTES + TAG_BYTES + 1) {
    throw new Error("encrypted token blob too short");
  }
  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(blob.length - TAG_BYTES);
  const ct = blob.subarray(IV_BYTES, blob.length - TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/* ── DB helpers ─────────────────────────────────────────────────────── */

export interface GithubIntegrationRow {
  id: number;
  customer_slug: string;
  github_user_id: number;
  github_login: string;
  scopes: string[];
  connected_at: string;
  last_used_at: string | null;
  connected_by_email: string | null;
}

export interface GithubIntegrationWithToken extends GithubIntegrationRow {
  access_token: string;
}

export async function getIntegration(
  customerSlug: string,
): Promise<GithubIntegrationRow | null> {
  const r = await query<GithubIntegrationRow>(
    `SELECT id, customer_slug, github_user_id, github_login, scopes,
            connected_at, last_used_at, connected_by_email
       FROM github_integrations
      WHERE customer_slug = $1 AND disconnected_at IS NULL
      LIMIT 1`,
    [customerSlug],
  );
  return r.rows[0] ?? null;
}

export async function getIntegrationWithToken(
  customerSlug: string,
): Promise<GithubIntegrationWithToken | null> {
  const r = await query<GithubIntegrationRow & { encrypted_token: Buffer }>(
    `SELECT id, customer_slug, github_user_id, github_login, scopes,
            connected_at, last_used_at, connected_by_email, encrypted_token
       FROM github_integrations
      WHERE customer_slug = $1 AND disconnected_at IS NULL
      LIMIT 1`,
    [customerSlug],
  );
  const row = r.rows[0];
  if (!row) return null;
  const { encrypted_token, ...rest } = row;
  return { ...rest, access_token: decryptToken(encrypted_token) };
}

export async function saveIntegration(input: {
  customer_slug: string;
  github_user_id: number;
  github_login: string;
  access_token: string;
  scopes: string[];
  connected_by_email: string;
}): Promise<void> {
  const ct = encryptToken(input.access_token);
  // Mark any prior active row as disconnected (in practice the partial
  // unique index forbids two active per slug — be belt-and-braces).
  await query(
    `UPDATE github_integrations
        SET disconnected_at = now()
      WHERE customer_slug = $1 AND disconnected_at IS NULL`,
    [input.customer_slug],
  );
  await query(
    `INSERT INTO github_integrations
        (customer_slug, github_user_id, github_login, encrypted_token, scopes, connected_by_email)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.customer_slug,
      input.github_user_id,
      input.github_login,
      ct,
      input.scopes,
      input.connected_by_email,
    ],
  );
}

export async function disconnectIntegration(customerSlug: string): Promise<void> {
  await query(
    `UPDATE github_integrations
        SET disconnected_at = now()
      WHERE customer_slug = $1 AND disconnected_at IS NULL`,
    [customerSlug],
  );
}

export async function touchUsed(customerSlug: string): Promise<void> {
  await query(
    `UPDATE github_integrations
        SET last_used_at = now()
      WHERE customer_slug = $1 AND disconnected_at IS NULL`,
    [customerSlug],
  );
}
