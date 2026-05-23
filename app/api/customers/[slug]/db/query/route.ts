import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerDb } from "@/lib/provisioner/db-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SQL_BYTES = 100 * 1024;

export const POST = withCustomerAuth<{ slug: string }>(
  async (req, { slug, userEmail }) => {
    const body = (await req.json().catch(() => ({}))) as {
      sql?: unknown;
      max_rows?: unknown;
    };
    const sql = typeof body.sql === "string" ? body.sql : "";
    if (!sql.trim()) {
      return NextResponse.json(
        { error: "missing sql", code: "missing_sql" },
        { status: 400 },
      );
    }
    if (Buffer.byteLength(sql, "utf8") > MAX_SQL_BYTES) {
      return NextResponse.json(
        { error: "sql too long", code: "sql_too_long" },
        { status: 400 },
      );
    }
    const maxRowsRaw =
      typeof body.max_rows === "number" ? body.max_rows : 1000;
    const max_rows = Math.max(1, Math.min(5000, Math.floor(maxRowsRaw)));

    try {
      const result = await provisionerDb.query(
        slug,
        { sql, max_rows },
        userEmail,
      );
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof ProvisionerHttpError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.status },
        );
      }
      throw err;
    }
  },
);
