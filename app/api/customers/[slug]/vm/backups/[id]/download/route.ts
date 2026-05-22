import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { streamBackupDownload } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

type Params = { slug: string; id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated", code: "no_session" }, { status: 401 });
  }
  const { slug, id } = await params;
  const allowed =
    session.appUser.role === "wcn_admin" ||
    session.appUser.customer_slug === slug ||
    session.impersonating?.customer_slug === slug;
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden", code: "no_membership" }, { status: 403 });
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
  const backupId = Number(id);
  if (!Number.isInteger(backupId) || backupId <= 0) {
    return NextResponse.json(
      { error: "invalid backup id", code: "bad_request" },
      { status: 400 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { passphrase?: string };
  const passphrase = body.passphrase ?? "";
  if (passphrase.length < 8) {
    return NextResponse.json(
      { error: "passphrase must be at least 8 characters", code: "invalid_passphrase" },
      { status: 400 },
    );
  }

  const upstream = await streamBackupDownload(
    slug,
    backupId,
    passphrase,
    session.appUser.email,
    req.signal,
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    let parsed: { error?: string; code?: string } = {};
    try {
      parsed = JSON.parse(text) as { error?: string; code?: string };
    } catch {
      // not json
    }
    return NextResponse.json(
      {
        error: parsed.error || text || upstream.statusText,
        code: parsed.code || "upstream_error",
      },
      { status: upstream.status || 502 },
    );
  }

  const headers = new Headers();
  headers.set("content-type", "application/octet-stream");
  const dispo =
    upstream.headers.get("content-disposition") ||
    `attachment; filename="backup-${slug}-${backupId}.sql.gz.gpg"`;
  headers.set("content-disposition", dispo);
  const len = upstream.headers.get("content-length");
  if (len) headers.set("content-length", len);
  headers.set("cache-control", "no-store");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
