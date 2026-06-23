import { NextResponse, type NextRequest } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { provisionerVms } from "@/lib/provisioner/vms-client";
import { parseWindow, parseSeries, VM_SERIES } from "@/lib/provisioner/metrics-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VOIP_SLUGS: Record<string, string> = {
  sbc: "voip-sbc",
  edge: "voip-edge",
  core: "voip-core",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ host: string }> },
) {
  await requireWcnAdmin();
  const { host } = await params;
  const slug = VOIP_SLUGS[host];
  if (!slug) {
    return NextResponse.json({ error: "unknown host", code: "bad_host" }, { status: 400 });
  }
  const window = parseWindow(req.nextUrl.searchParams.get("window"));
  if (!window) {
    return NextResponse.json({ error: "invalid window", code: "invalid_window" }, { status: 400 });
  }
  const series = parseSeries(req.nextUrl.searchParams.get("series"), VM_SERIES) ?? "cpu,ram,disk,net";
  const data = await provisionerVms.metrics(slug, window, series);
  return NextResponse.json(data);
}
