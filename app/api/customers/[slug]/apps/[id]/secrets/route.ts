import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import type { SecretInput } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KEY_RE = /^[A-Z][A-Z0-9_]{0,63}$/;

type Params = { slug: string; id: string };

export const GET = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const secrets = await provisionerApps.secrets.list(params.id, slug);
  return NextResponse.json(secrets);
}, { scope: "secrets:read" });

export const PUT = withCustomerAuth<Params>(async (req: NextRequest, { params, userEmail, slug }) => {
  const body = (await req.json().catch(() => null)) as SecretInput[] | null;
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json(
      { error: "array of {key, value} required", code: "bad_request" },
      { status: 400 },
    );
  }
  for (const s of body) {
    if (!s.key || !KEY_RE.test(s.key)) {
      return NextResponse.json(
        {
          error: `Invalid key "${s.key}". Use [A-Z][A-Z0-9_]{0,63}.`,
          code: "invalid_key",
        },
        { status: 400 },
      );
    }
    if (typeof s.value !== "string") {
      return NextResponse.json(
        { error: `Value for ${s.key} must be a string`, code: "invalid_value" },
        { status: 400 },
      );
    }
  }
  const result = await provisionerApps.secrets.put(params.id, body, userEmail, slug);
  return NextResponse.json(result);
}, { scope: "secrets:write" });
