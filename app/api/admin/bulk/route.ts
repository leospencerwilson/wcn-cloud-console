import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { provisionerBulk } from "@/lib/provisioner/bulk-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";
import type { BulkOperation } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPS: BulkOperation[] = ["vm.restart", "vm.stop", "vm.start", "vm.backup"];

async function guard() {
  const session = await getSession();
  if (!session)
    return {
      err: NextResponse.json(
        { error: "Unauthenticated", code: "no_session" },
        { status: 401 },
      ),
    };
  if (session.appUser.role !== "wcn_admin")
    return {
      err: NextResponse.json(
        { error: "Forbidden", code: "not_admin" },
        { status: 403 },
      ),
    };
  if (session.impersonating)
    return {
      err: NextResponse.json(
        {
          error: "Mutations are disabled while impersonating.",
          code: "impersonate_read_only",
        },
        { status: 403 },
      ),
    };
  return { session };
}

export async function GET(req: NextRequest) {
  const g = await guard();
  if (g.err) return g.err;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(500, Number(limitParam))) : 50;
  try {
    const jobs = await provisionerBulk.list(limit);
    return NextResponse.json(jobs);
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

export async function POST(req: NextRequest) {
  const g = await guard();
  if (g.err) return g.err;
  const body = (await req.json().catch(() => ({}))) as {
    operation?: string;
    args?: Record<string, unknown>;
    target_filter?: Record<string, unknown>;
    dry_run?: boolean;
  };
  const operation = body.operation as BulkOperation | undefined;
  if (!operation || !OPS.includes(operation)) {
    return NextResponse.json(
      { error: "invalid operation", code: "bad_request" },
      { status: 400 },
    );
  }
  const tf = body.target_filter || {};
  try {
    const created = await provisionerBulk.create(
      {
        operation,
        args: body.args || {},
        target_filter: {
          slugs: Array.isArray(tf.slugs) ? (tf.slugs as string[]) : undefined,
          tiers: Array.isArray(tf.tiers) ? (tf.tiers as string[]) : undefined,
          statuses: Array.isArray(tf.statuses)
            ? (tf.statuses as string[])
            : undefined,
          exclude_slugs: Array.isArray(tf.exclude_slugs)
            ? (tf.exclude_slugs as string[])
            : undefined,
        },
        dry_run: !!body.dry_run,
      },
      g.session!.appUser.email,
    );
    return NextResponse.json(created, { status: 202 });
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
