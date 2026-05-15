// Thin client for the WCN provisioner trigger (see /provisioner/server.js).
// All calls server-side only — never expose the token to the browser.

function baseUrl(): string {
  const url = process.env.PROVISIONER_URL;
  if (!url) throw new Error("PROVISIONER_URL is not set");
  return url.replace(/\/+$/, "");
}

function token(): string {
  const t = process.env.PROVISIONER_TOKEN;
  if (!t) throw new Error("PROVISIONER_TOKEN is not set");
  return t;
}

function authHeaders(): Record<string, string> {
  return { authorization: `Bearer ${token()}` };
}

export interface JobRef {
  jobId: string;
  status: "queued" | "running" | "succeeded" | "failed";
}

export interface JobStatus {
  jobId: string;
  kind: "provision" | "deprovision";
  slug: string;
  status: "queued" | "running" | "succeeded" | "failed";
  exitCode: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function startProvision(slug: string): Promise<JobRef> {
  const res = await fetch(`${baseUrl()}/provision`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ slug }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`provisioner ${res.status}: ${await res.text()}`);
  return (await res.json()) as JobRef;
}

export async function startDeprovision(slug: string, force = false): Promise<JobRef> {
  const res = await fetch(`${baseUrl()}/deprovision`, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify({ slug, force }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`provisioner ${res.status}: ${await res.text()}`);
  return (await res.json()) as JobRef;
}

export async function getJob(jobId: string): Promise<JobStatus | null> {
  const res = await fetch(`${baseUrl()}/jobs/${jobId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`provisioner ${res.status}: ${await res.text()}`);
  return (await res.json()) as JobStatus;
}

// Returns a streaming Response from the receiver — to be piped to the browser
// by an authenticated Next route handler.
export async function openJobStream(jobId: string): Promise<Response> {
  return fetch(`${baseUrl()}/jobs/${jobId}/stream`, {
    headers: authHeaders(),
    cache: "no-store",
  });
}
