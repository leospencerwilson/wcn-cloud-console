import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { provisionerBulk } from "@/lib/provisioner/bulk-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { id: string };

export async function POST(
  _req: Request,
  { params }: { params: Promise<Params> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthenticated", code: "no_session" },
      { status: 401 },
    );
  }
  if (session.appUser.role !== "wcn_admin") {
    return NextResponse.json(
      { error: "Forbidden", code: "not_admin" },
      { status: 403 },
    );
  }
  if (session.impersonating) {
    return NextResponse.json(
      {
        error: "Mutations are disabled while impersonating.",
        code: "impersonate_read_only",
      },
      { status: 403 },
    );
  }
  const { id } = await params;
  const jobId = Number(id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    return NextResponse.json(
      { error: "invalid id", code: "bad_request" },
      { status: 400 },
    );
  }
  try {
    const result = await provisionerBulk.abort(jobId, session.appUser.email);
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
