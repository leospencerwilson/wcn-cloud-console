import { SignJWT, jwtVerify } from "jose";
import type { AppUserRole } from "@/lib/db/users";

const ISSUER = "wcn-cloud-console";
const AUDIENCE = "wcn-cloud-forward-auth";

function getSecret(): Uint8Array {
  const secret = process.env.FORWARD_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("FORWARD_AUTH_SECRET must be set and at least 32 chars");
  }
  return new TextEncoder().encode(secret);
}

export interface ForwardJwtClaims {
  userId: string;
  role: AppUserRole;
  customerSlug: string | null;
}

export async function signForwardJWT(
  userId: string,
  role: AppUserRole,
  customerSlug: string | null,
): Promise<string> {
  return new SignJWT({ role, customerSlug })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyForwardJWT(token: string): Promise<ForwardJwtClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  const role = payload.role as AppUserRole | undefined;
  const customerSlug = (payload.customerSlug ?? null) as string | null;
  const userId = payload.sub;
  if (!userId || (role !== "wcn_admin" && role !== "customer_admin")) {
    throw new Error("Invalid forward JWT claims");
  }
  return { userId, role, customerSlug };
}

export const FORWARD_AUTH_COOKIE = "forward-auth-token";
