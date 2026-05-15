import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FORWARD_AUTH_COOKIE } from "@/lib/auth/forward";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const cookieStore = await cookies();
  cookieStore.set(FORWARD_AUTH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    domain: `.${rootDomain}`,
    maxAge: 0,
  });

  return NextResponse.redirect(
    new URL("/login", process.env.INVITE_BASE_URL ?? "http://localhost:3000"),
    { status: 303 },
  );
}
