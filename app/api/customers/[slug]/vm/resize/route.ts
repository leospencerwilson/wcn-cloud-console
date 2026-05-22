import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { slug, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as {
    cores?: number;
    memory_mb?: number;
    disk_gb?: number;
  };
  const input: { cores?: number; memory_mb?: number; disk_gb?: number } = {};
  if (typeof body.cores === "number") {
    if (body.cores < 1 || body.cores > 32) {
      return NextResponse.json(
        { error: "cores must be 1–32", code: "invalid_cores" },
        { status: 400 },
      );
    }
    input.cores = Math.floor(body.cores);
  }
  if (typeof body.memory_mb === "number") {
    if (body.memory_mb < 512 || body.memory_mb > 65536) {
      return NextResponse.json(
        { error: "memory_mb must be 512–65536", code: "invalid_memory" },
        { status: 400 },
      );
    }
    input.memory_mb = Math.floor(body.memory_mb);
  }
  if (typeof body.disk_gb === "number") {
    if (body.disk_gb < 10 || body.disk_gb > 2000) {
      return NextResponse.json(
        { error: "disk_gb must be 10–2000", code: "invalid_disk" },
        { status: 400 },
      );
    }
    input.disk_gb = Math.floor(body.disk_gb);
  }
  if (Object.keys(input).length === 0) {
    return NextResponse.json(
      { error: "at least one of cores, memory_mb, disk_gb required", code: "bad_request" },
      { status: 400 },
    );
  }
  const result = await provisionerVms.resize(slug, input, userEmail);
  return NextResponse.json(result, { status: 202 });
});
