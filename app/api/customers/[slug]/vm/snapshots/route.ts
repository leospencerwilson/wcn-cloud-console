import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms } from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAME_RE = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;

type Params = { slug: string };

export const GET = withCustomerAuth<Params>(async (_req, { slug }) => {
  const snaps = await provisionerVms.snapshots.list(slug);
  return NextResponse.json(snaps);
});

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { slug, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    label?: string;
  };
  if (!body.name || !NAME_RE.test(body.name)) {
    return NextResponse.json(
      {
        error: "Snapshot name must match [A-Za-z][A-Za-z0-9_-]{0,39}",
        code: "invalid_name",
      },
      { status: 400 },
    );
  }
  const result = await provisionerVms.snapshots.create(
    slug,
    { name: body.name, label: body.label },
    userEmail,
  );
  return NextResponse.json(result, { status: 202 });
});
