import { NextResponse, type NextRequest } from "next/server";
import { FORWARD_AUTH_COOKIE, verifyForwardJWT } from "@/lib/auth/forward";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(FORWARD_AUTH_COOKIE)?.value;
  if (!token) return new NextResponse(null, { status: 401 });

  let claims;
  try {
    claims = await verifyForwardJWT(token);
  } catch {
    return new NextResponse(null, { status: 401 });
  }

  const forwardedHost =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const slug = forwardedHost.split(".")[0]?.toLowerCase() ?? "";
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
