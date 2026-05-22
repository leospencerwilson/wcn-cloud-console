import type { PublicStatus } from "./types";

function baseUrl(): string {
  const url = process.env.PROVISIONER_BASE_URL;
  if (!url) throw new Error("PROVISIONER_BASE_URL is not set");
  return url.replace(/\/+$/, "");
}

function token(): string | null {
  return process.env.PROVISIONER_TOKEN ?? null;
}

export async function getPublicStatus(slug: string): Promise<PublicStatus | null> {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers.authorization = `Bearer ${t}`;

  const res = await fetch(`${baseUrl()}/public/status/${slug}`, {
    headers,
    next: { revalidate: 30 },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`status fetch failed: ${res.status} ${err}`);
  }
  return (await res.json()) as PublicStatus;
}
