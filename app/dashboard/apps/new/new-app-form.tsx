"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconPlus, IconX, IconRefresh, IconExternal } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { App, AppCreateInput } from "@/lib/provisioner/types";

type GhStatus = { connected: false } | {
  connected: true;
  github_login: string;
  scopes: string[];
  connected_at: string;
};

type GhRepo = {
  id: number;
  full_name: string;
  private: boolean;
  default_branch: string;
  clone_url: string;
  html_url: string;
  description: string | null;
  updated_at: string;
};

type SourceType = AppCreateInput["source_type"];
type BuildPack = NonNullable<AppCreateInput["build_pack"]>;

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

async function findAppByName(slug: string, name: string): Promise<App | null> {
  try {
    const r = await fetch(`/api/customers/${slug}/apps`, { cache: "no-store" });
    if (!r.ok) return null;
    const list = (await r.json().catch(() => [])) as App[];
    return list.find((a) => a.name === name) ?? null;
  } catch {
    return null;
  }
}

function sanitizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+/, "")
    .slice(0, 63);
}

export default function NewAppForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("git");
  const [repoMode, setRepoMode] = useState<"github" | "url">("github");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [dockerImage, setDockerImage] = useState("");
  const [buildPack, setBuildPack] = useState<BuildPack>("nixpacks");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── GitHub integration state ── */
  const [ghStatus, setGhStatus] = useState<GhStatus | null>(null);
  const [ghRepos, setGhRepos] = useState<GhRepo[] | null>(null);
  const [ghReposLoading, setGhReposLoading] = useState(false);
  const [ghReposError, setGhReposError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/customers/${slug}/integrations/github`, { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => { if (alive) setGhStatus(s as GhStatus); })
      .catch(() => { if (alive) setGhStatus({ connected: false }); });
    return () => { alive = false; };
  }, [slug]);

  async function loadRepos() {
    setGhReposLoading(true);
    setGhReposError(null);
    try {
      const r = await fetch(`/api/customers/${slug}/integrations/github/repos`, { cache: "no-store" });
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        setGhReposError(e.error || `HTTP ${r.status}`);
        return;
      }
      setGhRepos((await r.json()) as GhRepo[]);
    } catch (e) {
      setGhReposError(e instanceof Error ? e.message : "Network error");
    } finally {
      setGhReposLoading(false);
    }
  }

  // Auto-load repos once we know they're connected and they're in github mode.
  useEffect(() => {
    if (ghStatus?.connected && repoMode === "github" && !ghRepos && !ghReposLoading) {
      loadRepos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghStatus, repoMode]);

  function onRepoSelected(fullName: string) {
    const r = ghRepos?.find((x) => x.full_name === fullName);
    if (!r) return;
    setRepo(r.clone_url);
    setBranch(r.default_branch);
    if (!name) setName(sanitizeName(r.full_name.split("/")[1] || ""));
  }

  function validate(): string | null {
    if (!NAME_RE.test(name)) {
      return "Name must be lowercase letters, digits, and hyphens (start with letter/digit).";
    }
    if (sourceType === "git" && !repo.trim()) return "Git repository URL is required.";
    if (sourceType === "dockerfile" && !repo.trim()) return "Git repository URL is required.";
    if (sourceType === "dockerimage" && !dockerImage.trim()) {
      return "Docker image reference is required.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);

    const body: AppCreateInput = {
      name,
      source_type: sourceType,
      ...(sourceType !== "dockerimage" && {
        source_repo: repo.trim(),
        source_branch: branch.trim() || "main",
      }),
      ...(sourceType === "dockerimage" && { docker_image: dockerImage.trim() }),
      build_pack: sourceType === "dockerimage" ? "dockerimage" : buildPack,
    } as AppCreateInput;

    try {
      const res = await fetch(`/api/customers/${slug}/apps`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        // The upstream provisioner can throw mid-flight after the app has
        // already been created (e.g. JSON parse of an empty Coolify reply).
        // Recover by looking the app up by name and routing there.
        const existing = await findAppByName(slug, name);
        if (existing) {
          router.push(`/dashboard/apps/${existing.id}`);
          router.refresh();
          return;
        }
        setError(data.error || `Request failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      const created = (await res.json().catch(() => null)) as App | null;
      if (created && created.id) {
        router.push(`/dashboard/apps/${created.id}`);
      } else {
        const existing = await findAppByName(slug, name);
        router.push(existing ? `/dashboard/apps/${existing.id}` : `/dashboard/apps`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">§ NEW APPLICATION</h2>
        <Link
          href="/dashboard/apps"
          className="type-mono text-[12px]"
          style={{ color: "var(--color-muted)" }}
        >
          ← Back to apps
        </Link>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="px-8 py-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(sanitizeName(e.target.value))}
              placeholder="my-app"
              autoComplete="off"
              required
            />
            <p className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
              Lowercase, digits, hyphens. Used as the Coolify resource name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_type">Source</Label>
            <select
              id="source_type"
              className="field-input"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
            >
              <option value="git">Public Git repository (Nixpacks/Static)</option>
              <option value="dockerfile">Git repo with Dockerfile</option>
              <option value="dockerimage">Pre-built Docker image</option>
            </select>
          </div>

          {sourceType !== "dockerimage" && (
            <>
              {/* Mode switcher: GitHub picker ↔ free-form URL */}
              <div className="flex items-center gap-2 type-mono text-[12px]">
                <button
                  type="button"
                  className={`btn btn-sm ${repoMode === "github" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setRepoMode("github")}
                >
                  Choose from GitHub
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${repoMode === "url" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setRepoMode("url")}
                >
                  Paste URL
                </button>
              </div>

              {repoMode === "github" ? (
                <div className="space-y-2">
                  <Label htmlFor="gh_repo">Repository</Label>
                  {ghStatus === null ? (
                    <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
                      Checking GitHub connection…
                    </p>
                  ) : !ghStatus.connected ? (
                    <div
                      style={{
                        padding: "14px 16px",
                        border: "1px dashed var(--line)",
                        borderRadius: 3,
                        background: "var(--surface-1)",
                      }}
                      className="space-y-2"
                    >
                      <p className="type-mono text-[12.5px]" style={{ color: "var(--text-2)" }}>
                        No GitHub account connected yet. Connect to pick from your private repos.
                      </p>
                      <a
                        href={`/api/integrations/github/start?slug=${encodeURIComponent(slug)}`}
                        className="btn btn-primary btn-sm"
                      >
                        <IconExternal />
                        Connect GitHub
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="type-mono text-[11.5px]" style={{ color: "var(--text-3)" }}>
                          Connected as <code>@{ghStatus.github_login}</code>
                        </p>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setGhRepos(null); loadRepos(); }}
                          disabled={ghReposLoading}
                        >
                          <IconRefresh />
                          {ghReposLoading ? "Loading…" : "Refresh"}
                        </button>
                      </div>
                      {ghReposError && (
                        <p className="type-mono text-[12px]" style={{ color: "var(--color-danger, #b03020)" }}>
                          {ghReposError}
                        </p>
                      )}
                      <select
                        id="gh_repo"
                        className="field-input"
                        value={ghRepos?.find((r) => r.clone_url === repo)?.full_name ?? ""}
                        onChange={(e) => onRepoSelected(e.target.value)}
                        disabled={!ghRepos || ghReposLoading}
                      >
                        <option value="">
                          {ghReposLoading ? "Loading repositories…" :
                            ghRepos ? `Select from ${ghRepos.length} repos…` :
                            "Loading…"}
                        </option>
                        {ghRepos?.map((r) => (
                          <option key={r.id} value={r.full_name}>
                            {r.private ? "🔒 " : "  "}
                            {r.full_name} ({r.default_branch})
                            {r.description ? ` — ${r.description.slice(0, 60)}` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="space-y-2">
                        <Label htmlFor="branch_gh">Branch</Label>
                        <Input
                          id="branch_gh"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          placeholder="main"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="repo">Repository URL</Label>
                    <Input
                      id="repo"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                      placeholder="https://github.com/org/repo"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Input
                      id="branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      autoComplete="off"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {sourceType === "git" && (
            <div className="space-y-2">
              <Label htmlFor="build_pack">Build pack</Label>
              <select
                id="build_pack"
                className="field-input"
                value={buildPack}
                onChange={(e) => setBuildPack(e.target.value as BuildPack)}
              >
                <option value="nixpacks">Nixpacks (auto-detect)</option>
                <option value="static">Static site</option>
                <option value="dockercompose">Docker Compose</option>
              </select>
            </div>
          )}

          {sourceType === "dockerimage" && (
            <div className="space-y-2">
              <Label htmlFor="docker_image">Image reference</Label>
              <Input
                id="docker_image"
                value={dockerImage}
                onChange={(e) => setDockerImage(e.target.value)}
                placeholder="ghcr.io/org/image:tag"
                autoComplete="off"
              />
            </div>
          )}

          {error && (
            <p
              className="type-mono text-[12px]"
              style={{ color: "var(--color-danger, #b03020)" }}
            >
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              <IconPlus />
              {submitting ? "Creating…" : "Create application"}
            </button>
            <Link href="/dashboard/apps" className="btn btn-ghost">
              <IconX />
              Cancel
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
