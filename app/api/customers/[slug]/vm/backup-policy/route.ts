import { NextResponse, type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerVms } from "@/lib/provisioner/vms-client";
import type {
  BackupFrequency,
  BackupPolicyInput,
} from "@/lib/provisioner/vms-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string };

const FREQUENCIES: BackupFrequency[] = ["hourly", "daily", "weekly", "disabled"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const GET = withCustomerAuth<Params>(async (_req, { slug }) => {
  const policy = await provisionerVms.backupPolicy.get(slug);
  return NextResponse.json(policy);
}, { scope: "backups:read" });

export const PUT = withCustomerAuth<Params>(async (req: NextRequest, { slug, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as BackupPolicyInput;
  if (body.frequency !== undefined && !FREQUENCIES.includes(body.frequency)) {
    return NextResponse.json(
      { error: "invalid frequency", code: "bad_request" },
      { status: 400 },
    );
  }
  if (body.retention_days !== undefined) {
    const n = Number(body.retention_days);
    if (!Number.isFinite(n) || n < 1 || n > 365) {
      return NextResponse.json(
        { error: "retention_days must be 1–365", code: "bad_request" },
        { status: 400 },
      );
    }
    body.retention_days = Math.floor(n);
  }
  if (body.time_utc !== undefined && !TIME_RE.test(body.time_utc)) {
    return NextResponse.json(
      { error: "time_utc must be HH:MM[:SS] in 24h UTC", code: "bad_request" },
      { status: 400 },
    );
  }
  const result = await provisionerVms.backupPolicy.put(slug, body, userEmail);
  return NextResponse.json(result);
}, { scope: "backups:write" });
