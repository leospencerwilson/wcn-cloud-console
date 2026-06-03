import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerTokens } from "@/lib/provisioner/tokens-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const DELETE = withCustomerAuth<Params>(async (_req, { params, slug, userEmail }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "invalid id", code: "bad_request" },
      { status: 400 },
    );
  }
  const result = await provisionerTokens.revoke(slug, id, userEmail);
  return NextResponse.json(result);
}, { scope: "audit:admin" });
