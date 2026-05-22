import { ProvisionerHttpError } from "./apps-client";

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

export async function notifyImpersonate(
  customer_slug: string,
  action: "start" | "stop",
  actor: string,
  note?: string,
): Promise<void> {
  const res = await fetch(`${baseUrl()}/admin/impersonate`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token()}`,
      "content-type": "application/json",
      "x-wcn-actor": actor,
    },
    body: JSON.stringify({ customer_slug, action, note }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: res.statusText, code: "http_error" }));
    throw new ProvisionerHttpError(
      res.status,
      err.code || "http_error",
      err.error || res.statusText,
    );
  }
}
