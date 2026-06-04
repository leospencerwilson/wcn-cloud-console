import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerDns } from "@/lib/provisioner/dns-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

const PROVIDERS = ["cloudflare", "route53", "google", "vercel", "digitalocean"] as const;

export const GET = withCustomerAuth<Params>(async (_req, { slug }) => {
  const rows = await provisionerDns.list(slug);
  return NextResponse.json(rows);
}, { scope: "domains:read" });

export const POST = withCustomerAuth<Params>(async (req, { slug, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as {
    provider?: string;
    display_name?: string;
    credentials?: Record<string, unknown>;
  };
  const provider = String(body.provider || "").toLowerCase();
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return NextResponse.json(
      { error: `unknown provider — must be one of: ${PROVIDERS.join(", ")}`, code: "unknown_provider" },
      { status: 400 },
    );
  }
  const display_name = String(body.display_name || "").trim();
  if (!display_name) {
    return NextResponse.json(
      { error: "display_name is required", code: "missing_display_name" },
      { status: 400 },
    );
  }
  if (!body.credentials || typeof body.credentials !== "object") {
    return NextResponse.json(
      { error: "credentials is required", code: "missing_credentials" },
      { status: 400 },
    );
  }
  const created = await provisionerDns.create(
    slug,
    {
      provider: provider as (typeof PROVIDERS)[number],
      display_name,
      credentials: body.credentials,
    },
    userEmail,
  );
  return NextResponse.json(created, { status: 201 });
}, { scope: "domains:admin" });
