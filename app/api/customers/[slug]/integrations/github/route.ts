import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { getIntegration } from "@/lib/db/github-integration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/customers/[slug]/integrations/github
// Returns whether the customer has a live integration plus the github_login
// they connected with. Never exposes the access token.
export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const row = await getIntegration(slug);
  if (!row) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    github_login: row.github_login,
    scopes: row.scopes,
    connected_at: row.connected_at,
    connected_by_email: row.connected_by_email,
  });
}, { scope: "apps:read" });
