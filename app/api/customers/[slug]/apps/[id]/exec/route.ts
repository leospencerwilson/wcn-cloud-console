import { type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { proxySse } from "@/lib/provisioner/sse-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

export const POST = withCustomerAuth<Params>(
  async (req: NextRequest, { params, slug, userEmail }) => {
    const body = (await req.json().catch(() => ({}))) as {
      command?: string;
      container?: string;
    };
    return proxySse({
      path: `/apps/${params.id}/exec`,
      slug,
      method: "POST",
      body: { command: body.command, container: body.container },
      actor: userEmail,
      signal: req.signal,
    });
  },
);
