import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const IMPERSONATE_COOKIE = "wcn-impersonate";
export const IMPERSONATE_TTL_MS = 30 * 60 * 1000;
const ISSUER = "wcn-cloud-console";
const AUDIENCE = "wcn-cloud-impersonate";

function getSecret(): Uint8Array {
  const secret =
    process.env.IMPERSONATE_SECRET || process.env.FORWARD_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "IMPERSONATE_SECRET (or FORWARD_AUTH_SECRET) must be set and at least 32 chars",
    );
  }
  return new TextEncoder().encode(secret);
}

export type ImpersonateClaims = {
  admin_id: string;
  admin_email: string;
  customer_slug: string;
  started_at: string;
  note?: string;
};

export async function signImpersonateToken(claims: ImpersonateClaims): Promise<string> {
  return new SignJWT({
    admin_email: claims.admin_email,
    customer_slug: claims.customer_slug,
    started_at: claims.started_at,
    note: claims.note,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.admin_id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(
      Math.floor((Date.now() + IMPERSONATE_TTL_MS) / 1000),
    )
    .sign(getSecret());
}

export async function verifyImpersonateToken(
  token: string,
): Promise<ImpersonateClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const admin_id = payload.sub;
    const admin_email = String(payload.admin_email ?? "");
    const customer_slug = String(payload.customer_slug ?? "");
    const started_at = String(payload.started_at ?? "");
    const note =
      typeof payload.note === "string" && payload.note.length > 0
        ? payload.note
        : undefined;
    if (!admin_id || !admin_email || !customer_slug || !started_at) return null;
    if (Date.now() - new Date(started_at).getTime() > IMPERSONATE_TTL_MS) {
      return null;
    }
    return { admin_id, admin_email, customer_slug, started_at, note };
  } catch {
    return null;
  }
}

export async function readImpersonate(): Promise<ImpersonateClaims | null> {
  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  if (!raw) return null;
  return verifyImpersonateToken(raw);
}

export async function setImpersonateCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(IMPERSONATE_TTL_MS / 1000),
  });
}

export async function clearImpersonateCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export class ImpersonateReadOnlyError extends Error {
  code = "impersonate_read_only";
  constructor() {
    super("Mutations are disabled while impersonating.");
  }
}
