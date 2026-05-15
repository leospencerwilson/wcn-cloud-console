import { NextRequest } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { openJobStream } from "@/lib/provisioner/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JOB_ID = /^[0-9a-f-]{36}$/;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  await requireWcnAdmin();
  const { jobId } = await ctx.params;
  if (!JOB_ID.test(jobId)) {
    return new Response("bad job id", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await openJobStream(jobId);
  } catch (e) {
    return new Response(
      `provisioner unreachable: ${e instanceof Error ? e.message : String(e)}`,
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(`provisioner returned ${upstream.status}`, { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
