import { NextResponse, type NextRequest } from "next/server";
import { FORWARD_AUTH_COOKIE, verifyForwardJWT } from "@/lib/auth/forward";

export const dynamic = "force-dynamic";

// Service-prefix labels that customer-VM Caddy uses for per-service subdomains
// (wcn-cloud-iaas commit 03dc5ae). Strip these when falling back to
// X-Forwarded-Host parsing so we always end up with the customer slug.
const SERVICE_PREFIXES = new Set(["coolify", "studio", "api"]);

function resolveSlug(req: NextRequest): string | null {
  // Preferred: X-Wcn-Slug — set explicitly by the customer VM's (wcn_auth)
  // Caddyfile snippet so this endpoint doesn't have to parse it back out
  // of the host.
  const explicit = req.headers.get("x-wcn-slug")?.trim().toLowerCase();
  if (explicit) return explicit;

  // Fallback: X-Forwarded-Host. Pre-pivot Caddyfiles set the host to
  // `SLUG.western-communication.com`; post-pivot ones send the per-service
  // subdomains (`coolify.SLUG.…` etc.) for the auth-gated upstreams.
  const fwdHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const labels = fwdHost.toLowerCase().split(".");
  if (labels.length < 2) return null;
  return SERVICE_PREFIXES.has(labels[0]) ? labels[1] : labels[0];
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(FORWARD_AUTH_COOKIE)?.value;
  if (!token) return new NextResponse(null, { status: 401 });

  let claims;
  try {
    claims = await verifyForwardJWT(token);
  } catch {
    return new NextResponse(null, { status: 401 });
  }

  const slug = resolveSlug(req);
  if (!slug) return new NextResponse(null, { status: 401 });

  const allowed =
    claims.role === "wcn_admin" ||
    (claims.customerSlug !== null &&
      claims.customerSlug.toLowerCase() === slug);

  if (!allowed) return new NextResponse(null, { status: 401 });

  const res = new NextResponse(null, { status: 200 });
  res.headers.set("X-WCN-User-Id", claims.userId);
  res.headers.set("X-WCN-Role", claims.role);
  res.headers.set("X-WCN-Customer-Slug", claims.customerSlug ?? "");
  return res;
}
