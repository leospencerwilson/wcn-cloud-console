import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/db/users";
import { FORWARD_AUTH_COOKIE, signForwardJWT } from "@/lib/auth/forward";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const appUser = await getAppUser(user.id);
  if (!appUser || appUser.status !== "active") {
    return NextResponse.json({ error: "no app user" }, { status: 403 });
  }

  const token = await signForwardJWT(
    appUser.id,
    appUser.role,
    appUser.customer_slug,
  );

  const rootDomain = process.env.ROOT_DOMAIN ?? "western-communication.com";
  const cookieStore = await cookies();
  cookieStore.set(FORWARD_AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    domain: `.${rootDomain}`,
    maxAge: 12 * 60 * 60,
  });

  return NextResponse.json({ role: appUser.role });
}
