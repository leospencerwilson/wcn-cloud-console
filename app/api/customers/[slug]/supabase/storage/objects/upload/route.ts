import { type NextRequest } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

// Proxies an upload request (raw bytes + Content-Type header) straight to
// the provisioner, which forwards it on to Kong /storage/v1/object/...
// with the customer's service-role key. The browser never sees the key.
export const POST = withCustomerAuth<{ slug: string }>(async (req: NextRequest, { slug }) => {
  const bucket = req.nextUrl.searchParams.get("bucket") || "";
  const objPath = req.nextUrl.searchParams.get("path") || "";
  if (!bucket || !objPath) {
    return new Response(JSON.stringify({ error: "bucket and path required", code: "missing_params" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const provBase = (process.env.PROVISIONER_BASE_URL || "").replace(/\/+$/, "");
  const provTok = process.env.PROVISIONER_TOKEN;
  if (!provBase || !provTok) {
    return new Response(JSON.stringify({ error: "provisioner not configured", code: "no_provisioner" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  // Pass through the original Content-Type and stream the body up.
  const ct = req.headers.get("content-type") || "application/octet-stream";
  const body = await req.arrayBuffer();
  const url = `${provBase}/vms/${slug}/supabase/storage/objects/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(objPath)}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${provTok}`,
      "content-type": ct,
    },
    body,
  });
  const text = await upstream.text();
  return new Response(text || "{}", {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  });
}, { scope: "vms:write" });
