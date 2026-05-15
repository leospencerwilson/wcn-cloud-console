import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/health",
  "/api/verify",
  "/api/auth/login",
  "/api/auth/logout",
];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/invite/")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/brand")) return true;
  if (pathname === "/favicon.ico") return true;
  return PUBLIC_PATHS.includes(pathname);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (!isAdminRoute && !isDashboardRoute) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Role checks are enforced in layouts via requireWcnAdmin /
  // requireCustomerAdmin which query the ops DB. Middleware only verifies the
  // session exists.
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
