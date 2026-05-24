import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import { APP_SERIES, parseSeries, parseWindow } from "@/lib/provisioner/metrics-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (req: NextRequest, { params, slug }) => {
  const window = parseWindow(req.nextUrl.searchParams.get("window"));
  if (!window) {
    return NextResponse.json(
      { error: "invalid window", code: "invalid_window" },
      { status: 400 },
    );
  }
  const seriesParam =
    parseSeries(req.nextUrl.searchParams.get("series"), APP_SERIES) ??
    "cpu,ram,net";
  const data = await provisionerApps.apps.metrics(params.id, window, seriesParam, slug);
  return NextResponse.json(data);
});
