import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerSupabase } from "@/lib/provisioner/supabase-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withCustomerAuth<{ slug: string }>(
  async (_req, { slug, role }) => {
    const data = await provisionerSupabase.connection(slug);
    if (role !== "wcn_admin") {
      const { direct_internal: _omit, ...rest } = data.connection_strings;
      void _omit;
      return NextResponse.json({
        ...data,
        connection_strings: rest,
      });
    }
    return NextResponse.json(data);
  },
);
