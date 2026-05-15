import { NextRequest, NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getJob } from "@/lib/provisioner/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JOB_ID = /^[0-9a-f-]{36}$/;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  await requireWcnAdmin();
  const { jobId } = await ctx.params;
  if (!JOB_ID.test(jobId)) {
    return NextResponse.json({ error: "bad job id" }, { status: 400 });
  }
  try {
    const job = await getJob(jobId);
    if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(job);
  } catch (e) {
    return NextResponse.json(
      { error: "provisioner unreachable", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
