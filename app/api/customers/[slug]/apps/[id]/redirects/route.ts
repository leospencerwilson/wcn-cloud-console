import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import type { RedirectRuleInput } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const rules = await provisionerApps.redirects.list(params.id, slug);
  return NextResponse.json(rules);
});

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params, userEmail, slug }) => {
  const body = (await req.json().catch(() => ({}))) as Partial<RedirectRuleInput>;
  if (!body.from_host || !body.to_url) {
    return NextResponse.json(
      { error: "from_host and to_url are required", code: "bad_request" },
      { status: 400 },
    );
  }
  const code = body.status_code ?? 301;
  if (code !== 301 && code !== 302) {
    return NextResponse.json(
      { error: "status_code must be 301 or 302", code: "invalid_status_code" },
      { status: 400 },
    );
  }
  const result = await provisionerApps.redirects.create(
    params.id,
    {
      from_host: body.from_host,
      from_path: body.from_path,
      to_url: body.to_url,
      status_code: code,
    },
    userEmail,
    slug,
  );
  return NextResponse.json(result, { status: 201 });
});
