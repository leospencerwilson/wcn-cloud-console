import { ProvisionerHttpError } from "./apps-client";
import type { TeamInviteCreated, TeamMember, TeamRole } from "./types";

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

async function call<T>(
  path: string,
  init: RequestInit & { actor?: string } = {},
): Promise<T> {
  const { actor, headers, ...rest } = init;
  const res = await fetch(`${baseUrl()}${path}`, {
    ...rest,
    headers: {
      authorization: `Bearer ${token()}`,
      ...(rest.body ? { "content-type": "application/json" } : {}),
      ...(actor ? { "x-wcn-actor": actor } : {}),
      ...(headers || {}),
    },
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
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ProvisionerHttpError(
      res.status,
      "bad_upstream_body",
      `Upstream returned non-JSON body (${res.status})`,
    );
  }
}

export const provisionerTeam = {
  list: (slug: string) => call<TeamMember[]>(`/customers/${slug}/team`),
  invite: (slug: string, email: string, role: TeamRole, actor: string) =>
    call<TeamInviteCreated>(`/customers/${slug}/team/invites`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
      actor,
    }),
  patchRole: (slug: string, id: number, role: TeamRole, actor: string) =>
    call<TeamMember>(`/customers/${slug}/team/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
      actor,
    }),
  revoke: (slug: string, id: number, actor: string) =>
    call<{ ok: true }>(`/customers/${slug}/team/${id}`, {
      method: "DELETE",
      actor,
    }),
  byEmail: (slug: string, email: string) =>
    call<TeamMember>(
      `/customers/${slug}/team/by-email?email=${encodeURIComponent(email)}`,
    ),
  acceptInvite: (token_: string, accepting_email: string) =>
    call<{ ok: true; customer_slug: string; role: TeamRole }>(
      `/team/invites/accept`,
      {
        method: "POST",
        body: JSON.stringify({ token: token_, accepting_email }),
      },
    ),
};
