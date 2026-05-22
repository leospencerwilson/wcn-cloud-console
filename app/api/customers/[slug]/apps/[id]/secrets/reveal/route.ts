import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    password?: string;
  };
  if (!body.key) {
    return NextResponse.json(
      { error: "key required", code: "bad_request" },
      { status: 400 },
    );
  }
  if (!body.password) {
    return NextResponse.json(
      { error: "password required", code: "password_required" },
      { status: 401 },
    );
  }

  // Re-verify the session user's password before revealing.
  const supabase = await createSupabaseServerClient();
  const { error: signinErr } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: body.password,
  });
  if (signinErr) {
    return NextResponse.json(
      { error: "Password did not match", code: "bad_password" },
      { status: 401 },
    );
  }

  const result = await provisionerApps.secrets.reveal(params.id, body.key, userEmail);
  return NextResponse.json(result);
});
