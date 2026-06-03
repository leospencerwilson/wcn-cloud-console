import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { getIntegrationWithToken, touchUsed } from "@/lib/db/github-integration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  ssh_url: string;
  clone_url: string;
  updated_at: string;
  archived: boolean;
  disabled: boolean;
  description: string | null;
}

// GET /api/customers/[slug]/integrations/github/repos
// Returns up to 200 of the user's most-recently-updated repos (private +
// public). The dropdown wants what they're actually likely to deploy, not
// every repo they've ever forked.
export const GET = withCustomerAuth<{ slug: string }>(async (_req, { slug }) => {
  const integ = await getIntegrationWithToken(slug);
  if (!integ) {
    return NextResponse.json(
      { error: "not_connected", code: "not_connected" },
      { status: 409 },
    );
  }

  const collected: GithubRepo[] = [];
  let page = 1;
  while (collected.length < 200 && page <= 2) {
    const url = new URL("https://api.github.com/user/repos");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("visibility", "all");
    url.searchParams.set("affiliation", "owner,collaborator,organization_member");

    const r = await fetch(url.toString(), {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${integ.access_token}`,
        "x-github-api-version": "2022-11-28",
      },
      cache: "no-store",
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: "github_api_error", code: "github_api_error", status: r.status, body: text.slice(0, 200) },
        { status: 502 },
      );
    }
    const batch = (await r.json()) as GithubRepo[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    collected.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  await touchUsed(slug);

  return NextResponse.json(
    collected
      .filter((r) => !r.archived && !r.disabled)
      .map((r) => ({
        id: r.id,
        full_name: r.full_name,
        private: r.private,
        default_branch: r.default_branch,
        clone_url: r.clone_url,
        ssh_url: r.ssh_url,
        html_url: r.html_url,
        description: r.description,
        updated_at: r.updated_at,
      })),
  );
}, { scope: "apps:read" });
