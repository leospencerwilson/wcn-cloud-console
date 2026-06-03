import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerTeam } from "@/lib/provisioner/team-client";
import type { TeamRole } from "@/lib/provisioner/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROLES: TeamRole[] = ["owner", "admin", "developer", "viewer"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Params = { slug: string };

export const POST = withCustomerAuth<Params>(async (req: NextRequest, { slug, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as { email?: string; role?: string };
  const email = (body.email || "").trim().toLowerCase();
  const role = body.role as TeamRole | undefined;
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "invalid_email", code: "invalid_email" },
      { status: 400 },
    );
  }
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json(
      { error: "invalid_role", code: "invalid_role" },
      { status: 400 },
    );
  }
  const created = await provisionerTeam.invite(slug, email, role, userEmail);
  return NextResponse.json(created, { status: 201 });
}, { scope: "audit:admin" });
