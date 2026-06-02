"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconPlus, IconX } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { App, AppCreateInput } from "@/lib/provisioner/types";

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
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [dockerImage, setDockerImage] = useState("");
  const [buildPack, setBuildPack] = useState<BuildPack>("nixpacks");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h2 className="type-h2">— NEW APPLICATION</h2>
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
