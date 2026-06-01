import { NextRequest, NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { cancelJob } from "@/lib/provisioner/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JOB_ID = /^[0-9a-f-]{36}$/;

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  await requireWcnAdmin();
  const { jobId } = await ctx.params;
  if (!JOB_ID.test(jobId)) {
    return NextResponse.json({ error: "bad job id" }, { status: 400 });
  }
  try {
    const upstream = await cancelJob(jobId);
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "provisioner unreachable", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
