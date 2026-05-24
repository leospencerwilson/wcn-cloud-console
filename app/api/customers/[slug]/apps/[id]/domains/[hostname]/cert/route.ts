import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import type { DomainCertInput } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { slug: string; id: string; hostname: string };

const CERT_BLOCK = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/;
const KEY_BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/;

export const GET = withCustomerAuth<Params>(async (_req, { params, slug }) => {
  const meta = await provisionerApps.certs.get(params.id, params.hostname, slug);
  return NextResponse.json(meta);
});

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { params, userEmail, slug }) => {
  const body = (await req.json().catch(() => ({}))) as DomainCertInput;
  if (!body.cert_pem || !CERT_BLOCK.test(body.cert_pem)) {
    return NextResponse.json(
      { error: "cert_pem must be a PEM-encoded X.509 certificate", code: "invalid_cert" },
      { status: 400 },
    );
  }
  if (!body.key_pem || !KEY_BLOCK.test(body.key_pem)) {
    return NextResponse.json(
      { error: "key_pem must be a PEM-encoded private key", code: "invalid_key" },
      { status: 400 },
    );
  }
  if (body.chain_pem !== undefined && body.chain_pem.length > 0 && !CERT_BLOCK.test(body.chain_pem)) {
    return NextResponse.json(
      { error: "chain_pem must be PEM-encoded certificates", code: "invalid_cert" },
      { status: 400 },
    );
  }
  const meta = await provisionerApps.certs.upload(
    params.id,
    params.hostname,
    body,
    userEmail,
    slug,
  );
  return NextResponse.json(meta, { status: 201 });
});

export const DELETE = withCustomerAuth<Params>(async (_req, { params, userEmail, slug }) => {
  const result = await provisionerApps.certs.remove(params.id, params.hostname, userEmail, slug);
  return NextResponse.json(result);
});
