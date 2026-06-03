import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms } from "@/lib/provisioner/vms-client";
import { parseSeries, parseWindow, VM_SERIES } from "@/lib/provisioner/metrics-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

export const GET = withCustomerAuth<Params>(async (req: NextRequest, { slug }) => {
  const window = parseWindow(req.nextUrl.searchParams.get("window"));
  if (!window) {
    return NextResponse.json(
      { error: "invalid window", code: "invalid_window" },
      { status: 400 },
    );
  }
  const seriesParam =
    parseSeries(req.nextUrl.searchParams.get("series"), VM_SERIES) ??
    "cpu,ram,disk,net";
  const data = await provisionerVms.metrics(slug, window, seriesParam);
  return NextResponse.json(data);
}, { scope: "metrics:read" });
