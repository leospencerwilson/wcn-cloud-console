import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { provisionerTeam } from "@/lib/provisioner/team-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthenticated", code: "no_session" },
      { status: 401 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = (body.token || "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "missing token", code: "bad_request" },
      { status: 400 },
    );
  }
  try {
    const result = await provisionerTeam.acceptInvite(token, session.appUser.email);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown", code: "internal_error" },
      { status: 500 },
    );
  }
}
