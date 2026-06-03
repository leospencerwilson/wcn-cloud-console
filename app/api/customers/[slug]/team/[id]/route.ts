import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerTeam } from "@/lib/provisioner/team-client";
import type { TeamRole } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROLES: TeamRole[] = ["owner", "admin", "developer", "viewer"];

type Params = { slug: string; id: string };

export const PATCH = withCustomerAuth<Params>(async (req: NextRequest, { params, slug, userEmail }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "invalid id", code: "bad_request" },
      { status: 400 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { role?: string };
  const role = body.role as TeamRole | undefined;
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json(
      { error: "invalid_role", code: "invalid_role" },
      { status: 400 },
    );
  }
  const updated = await provisionerTeam.patchRole(slug, id, role, userEmail);
  return NextResponse.json(updated);
}, { scope: "audit:admin" });

export const DELETE = withCustomerAuth<Params>(async (_req, { params, slug, userEmail }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "invalid id", code: "bad_request" },
      { status: 400 },
    );
  }
  const result = await provisionerTeam.revoke(slug, id, userEmail);
  return NextResponse.json(result);
}, { scope: "audit:admin" });
