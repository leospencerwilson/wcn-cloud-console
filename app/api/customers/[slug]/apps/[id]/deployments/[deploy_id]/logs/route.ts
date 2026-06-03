import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { proxySse } from "@/lib/provisioner/sse-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string; deploy_id: string };

export const GET = withCustomerAuth<Params>(async (req, { params, slug }) => {
  return proxySse({
    path: `/apps/${params.id}/deployments/${params.deploy_id}/logs`,
    slug,
    signal: req.signal,
  });
}, { scope: "apps:read" });
