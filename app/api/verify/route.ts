import { NextResponse, type NextRequest } from "next/server";
import { FORWARD_AUTH_COOKIE, verifyForwardJWT } from "@/lib/auth/forward";

export const dynamic = "force-dynamic";

// Dash-suffix layout (current): first label is `admin-SLUG` / `db-SLUG` /
// `api-SLUG` / `SLUG`. Strip the role prefix to recover the slug.
const DASH_PREFIX_RE = /^(admin|db|api)-/;

// Legacy dot-prefix layout: first label was `coolify` / `studio` / `api` and
// the slug sat in the second label. Pre-pivot customer VMs may still send
// these — keep until none remain (rebake/destroy to drop the branch).
const LEGACY_DOT_PREFIXES = new Set(["coolify", "studio", "api"]);

function resolveSlug(req: NextRequest): string | null {
  // Preferred: X-Wcn-Slug — set explicitly by the customer VM's (wcn_auth)
  // Caddyfile snippet so this endpoint doesn't have to parse it back out
  // of the host.
  const explicit = req.headers.get("x-wcn-slug")?.trim().toLowerCase();
  if (explicit) return explicit;

  // Fallback: X-Forwarded-Host.
  const fwdHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const labels = fwdHost.toLowerCase().split(".");
  if (labels.length < 2) return null;

  const stripped = labels[0].replace(DASH_PREFIX_RE, "");
  if (stripped !== labels[0]) return stripped;
  if (LEGACY_DOT_PREFIXES.has(labels[0])) return labels[1];
  return labels[0];
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
