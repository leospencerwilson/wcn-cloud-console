import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { provisionerVms } from "@/lib/provisioner/vms-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export async function POST(
  _req: Request,
  { params }: { params: Promise<Params> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated", code: "no_session" }, { status: 401 });
  }
  if (session.appUser.role !== "wcn_admin") {
    return NextResponse.json({ error: "Forbidden", code: "not_admin" }, { status: 403 });
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
  const { slug, id } = await params;
  const backupId = Number(id);
  if (!Number.isInteger(backupId) || backupId <= 0) {
    return NextResponse.json(
      { error: "invalid backup id", code: "bad_request" },
      { status: 400 },
    );
  }
  try {
    const result = await provisionerVms.backups.restore(
      slug,
      backupId,
      session.appUser.email,
    );
    return NextResponse.json(result, { status: 202 });
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
