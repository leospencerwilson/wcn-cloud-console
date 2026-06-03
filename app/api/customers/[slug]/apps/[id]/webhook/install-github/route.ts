import { NextResponse } from "next/server";
import { withCustomerAuth } from "@/lib/provisioner/with-customer-auth";
import { provisionerWebhooks } from "@/lib/provisioner/webhook-client";
import { provisionerApps } from "@/lib/provisioner/apps-client";
import { getIntegrationWithToken, touchUsed } from "@/lib/db/github-integration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { slug: string; id: string };

// Parses owner/repo out of a GitHub clone URL (https or ssh form).
function parseGithubRepo(source: string | null | undefined): { owner: string; repo: string } | null {
  if (!source) return null;
  // https://github.com/<owner>/<repo>(.git)?
  const https = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(source);
  if (https) return { owner: https[1], repo: https[2] };
  // git@github.com:<owner>/<repo>(.git)?
  const ssh = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/.exec(source);
  if (ssh) return { owner: ssh[1], repo: ssh[2] };
  return null;
}

// POST /api/customers/[slug]/apps/[id]/webhook/install-github
// Body: { branch?: string }
// Flow:
//   1. Confirm a GitHub integration is connected for this customer.
//   2. Resolve the apps GitHub owner/repo from its source_repo.
//   3. Ensure a WCN webhook config exists on the provisioner — create
//      if needed (provisioner generates the URL + shared secret).
//   4. POST the URL + secret to GitHub /repos/{owner}/{repo}/hooks via the
//      customers stored OAuth token.
//   5. Return the GitHub hook id alongside the WCN config so the UI can
//      surface "installed as github hook #N".
export const POST = withCustomerAuth<Params>(async (req, { slug, params, userEmail }) => {
  const body = (await req.json().catch(() => ({}))) as { branch?: string };
  const branch = typeof body.branch === "string" && body.branch.trim() ? body.branch.trim() : "main";

  // 1. integration check
  const integ = await getIntegrationWithToken(slug);
  if (!integ) {
    return NextResponse.json(
      { error: "GitHub not connected for this customer. Connect first from /dashboard/apps/new or settings.", code: "not_connected" },
      { status: 409 },
    );
  }

  // 2. resolve owner/repo from the app
  let app;
  try {
    app = await provisionerApps.apps.get(params.id, slug);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "app_lookup_failed", code: "app_lookup_failed" }, { status: 502 });
  }
  const target = parseGithubRepo(app.source_repo);
  if (!target) {
    return NextResponse.json(
      { error: `Apps source_repo (${app.source_repo ?? "none"}) is not a github.com URL.`, code: "not_github" },
      { status: 400 },
    );
  }

  // 3. ensure WCN webhook exists
  let existing = await provisionerWebhooks.get(params.id, slug).catch(() => null);
  let secret: string | undefined;
  let webhookUrl: string | undefined;
  if (!existing || !existing.configured) {
    const created = await provisionerWebhooks.create(params.id, branch, userEmail, slug);
    secret = created.secret;
    webhookUrl = created.webhook_url;
    existing = await provisionerWebhooks.get(params.id, slug);
  } else {
    webhookUrl = existing.webhook_url;
    // We can't read back the secret once created — for an existing config
    // the user already has it; the GitHub install needs a secret, so we
    // rotate by deleting + recreating to get a fresh one.
    await provisionerWebhooks.remove(params.id, userEmail, slug);
    const created = await provisionerWebhooks.create(params.id, branch, userEmail, slug);
    secret = created.secret;
    webhookUrl = created.webhook_url;
    existing = await provisionerWebhooks.get(params.id, slug);
  }
  if (!secret || !webhookUrl) {
    return NextResponse.json({ error: "webhook_setup_failed", code: "webhook_setup_failed" }, { status: 502 });
  }

  // 4. install on GitHub
  const ghRes = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/hooks`,
    {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${integ.access_token}`,
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret,
          insecure_ssl: "0",
        },
      }),
    },
  );
  if (!ghRes.ok) {
    const ghBody = await ghRes.text().catch(() => "");
    return NextResponse.json(
      {
        error: `GitHub refused to install the webhook (${ghRes.status}).`,
        code: "github_install_failed",
        github_status: ghRes.status,
        github_body: ghBody.slice(0, 400),
      },
      { status: 502 },
    );
  }
  const ghHook = (await ghRes.json()) as { id: number };
  await touchUsed(slug).catch(() => {});

  return NextResponse.json({
    ok: true,
    webhook_url: webhookUrl,
    github_hook_id: ghHook.id,
    github_owner: target.owner,
    github_repo: target.repo,
  });
}, { scope: "apps:write" });
