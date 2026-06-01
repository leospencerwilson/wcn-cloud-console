import { NextRequest } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getJobLog } from "@/lib/provisioner/client";

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
    return new Response("bad job id", { status: 400 });
  }
  try {
    const text = await getJobLog(jobId);
    return new Response(text, {
      status: 200,
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    });
  } catch (e) {
    return new Response(
      `provisioner unreachable: ${e instanceof Error ? e.message : String(e)}`,
      { status: 502 },
    );
  }
}
