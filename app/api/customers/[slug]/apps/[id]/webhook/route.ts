import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerWebhooks } from "@/lib/provisioner/webhook-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (_req, { params }) => {
  const cfg = await provisionerWebhooks.get(params.id);
  return NextResponse.json(cfg);
});

export const POST = withCustomerAuth<Params>(
  async (req, { params, userEmail }) => {
    const body = (await req.json().catch(() => ({}))) as { branch?: unknown };
    const branch = typeof body.branch === "string" ? body.branch : undefined;
    const created = await provisionerWebhooks.create(
      params.id,
      branch,
      userEmail,
    );
    return NextResponse.json(created, { status: 201 });
  },
);

export const PATCH = withCustomerAuth<Params>(
  async (req, { params, userEmail }) => {
    const body = (await req.json().catch(() => ({}))) as {
      branch?: unknown;
      enabled?: unknown;
    };
    const patch: { branch?: string; enabled?: boolean } = {};
    if (typeof body.branch === "string") patch.branch = body.branch;
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    const cfg = await provisionerWebhooks.patch(params.id, patch, userEmail);
    return NextResponse.json(cfg);
  },
);

export const DELETE = withCustomerAuth<Params>(
  async (_req, { params, userEmail }) => {
    const r = await provisionerWebhooks.remove(params.id, userEmail);
    return NextResponse.json(r);
  },
);
