import { NextResponse } from "next/server";
import crypto from "crypto";
import { provisionerWebhooks } from "@/lib/provisioner/webhook-client";
import { ProvisionerHttpError } from "@/lib/provisioner/apps-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function baseUrl(): string {
  const url = process.env.PROVISIONER_BASE_URL;
  if (!url) throw new Error("PROVISIONER_BASE_URL is not set");
  return url.replace(/\/+$/, "");
}

function token(): string {
  const t = process.env.PROVISIONER_TOKEN;
  if (!t) throw new Error("PROVISIONER_TOKEN is not set");
  return t;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ webhook_id: string }> },
) {
  const { webhook_id } = await ctx.params;
  const event = req.headers.get("x-github-event");
  const sigHeader = req.headers.get("x-hub-signature-256") || "";
  const body = await req.text();

  if (event === "ping") return new NextResponse("ok", { status: 200 });
  if (event !== "push")
    return new NextResponse("ignored", { status: 200 });

  let cfg;
  try {
    cfg = await provisionerWebhooks.lookup(webhook_id);
  } catch (err) {
    if (err instanceof ProvisionerHttpError) {
      if (err.status === 410)
        return new NextResponse("disabled", { status: 410 });
      return new NextResponse("unknown", { status: 404 });
    }
    return new NextResponse("provisioner unreachable", { status: 502 });
  }

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", cfg.secret).update(body).digest("hex");
  if (!timingSafeEqualStrings(sigHeader, expected)) {
    return new NextResponse("bad signature", { status: 401 });
  }

  let payload: { ref?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse("invalid json", { status: 400 });
  }
  const branch = (payload.ref || "").replace(/^refs\/heads\//, "");
  if (branch !== cfg.branch) {
    return new NextResponse("not target branch", { status: 200 });
  }

  try {
    const url = `${baseUrl()}/apps/${cfg.app_id}/deploy?slug=${encodeURIComponent(
      cfg.customer_slug,
    )}`;
    await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token()}`,
        "content-type": "application/json",
        "x-wcn-actor": "github-webhook",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });
  } catch {
    return new NextResponse("deploy trigger failed", { status: 502 });
  }

  provisionerWebhooks.delivered(cfg.app_id).catch(() => {});

  return new NextResponse("ok", { status: 200 });
}
