import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/db/users";
import { FORWARD_AUTH_COOKIE, signForwardJWT } from "@/lib/auth/forward";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    console.log("[login] step 1: createSupabaseServerClient");
    const supabase = await createSupabaseServerClient();
    console.log("[login] step 2: getUser");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[login] no user from supabase auth");
      return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    }
    console.log("[login] step 3: getAppUser for", user.id);
    const appUser = await getAppUser(user.id);
    if (!appUser || appUser.status !== "active") {
      console.log("[login] no active app user for", user.id, "got:", JSON.stringify(appUser));
      return NextResponse.json({ error: "no app user" }, { status: 403 });
    }
    console.log("[login] step 4: signForwardJWT");
    const token = await signForwardJWT(
      appUser.id,
      appUser.role,
      appUser.customer_slug,
    );
    console.log("[login] step 5: set cookie");
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
    console.log("[login] step 6: respond OK");
    return NextResponse.json({ role: appUser.role });
  } catch (e) {
    const err = e as Error;
    console.error("[login] FAILED:", err.message);
    console.error(err.stack);
    return NextResponse.json({ error: "internal", message: err.message }, { status: 500 });
  }
}
