import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import type { CronTaskInput } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const tasks = await provisionerApps.cron.list(params.id, slug);
  return NextResponse.json(tasks);
});

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params, slug }) => {
  const body = (await req.json().catch(() => ({}))) as Partial<CronTaskInput>;
  if (!body.name || !body.command || !body.frequency) {
    return NextResponse.json(
      { error: "name, command and frequency are required", code: "bad_request" },
      { status: 400 },
    );
  }
  const task = await provisionerApps.cron.create(params.id, {
    name: body.name,
    command: body.command,
    frequency: body.frequency,
    container: body.container,
  }, slug);
  return NextResponse.json(task, { status: 201 });
});
