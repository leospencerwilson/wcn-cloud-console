import { NextRequest, NextResponse } from "next/server";
import { requireWcnAdmin } from "@/lib/auth/session";
import { getCustomerHealth } from "@/lib/provisioner/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  await requireWcnAdmin();
  const { slug } = await ctx.params;
  if (!SLUG.test(slug)) {
    return NextResponse.json({ error: "bad slug" }, { status: 400 });
  }
  try {
    const data = await getCustomerHealth(slug);
    return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { components: [], error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
