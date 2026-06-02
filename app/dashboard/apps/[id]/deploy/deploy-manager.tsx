"use client";

import { useState } from "react";
import {
  IconCopy,
  IconPlus,
  IconCheck,
  IconSave,
  IconX,
  IconTrash,
} from "@/components/ui/icons";
import type {
  AppWebhookConfig,
  AppWebhookCreated,
} from "@/lib/provisioner/types";

type Props = {
  slug: string;
  appId: string;
  initial: AppWebhookConfig;
  loadError: string | null;
};

function webhookUrlFor(webhookId: string): string {
  if (typeof window === "undefined") return `/api/webhooks/github/${webhookId}`;
  return `${window.location.origin}/api/webhooks/github/${webhookId}`;
}

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code
        className="type-mono"
        style={{
          flex: 1,
          padding: "8px 10px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-2)",
          background: "var(--surface)",
          fontSize: 12,
          color: "var(--text)",
          overflow: "auto",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </code>
      <button
        type="button"
        className="btn-ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        <IconCopy />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function DeployManager({
  slug,
  appId,
  initial,
  loadError,
}: Props) {
  const [config, setConfig] = useState<AppWebhookConfig>(initial);
  const [justCreated, setJustCreated] = useState<AppWebhookCreated | null>(
    null,
  );
  const [branch, setBranch] = useState(
    initial.configured ? initial.branch : "main",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(loadError);

  const apiPath = `/api/customers/${slug}/apps/${appId}/webhook`;

  async function call(init: RequestInit): Promise<unknown> {
    const res = await fetch(apiPath, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `${res.status}`);
    }
    return data;
  }

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const created = (await call({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ branch }),
      })) as AppWebhookCreated;
      setJustCreated(created);
      setConfig({
        configured: true,
        webhook_id: created.webhook_id,
        webhook_url: webhookUrlFor(created.webhook_id),
        branch: created.branch,
        enabled: created.enabled,
        last_delivery_at: null,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function patch(p: { branch?: string; enabled?: boolean }) {
    setBusy(true);
    setErr(null);
    try {
      const next = (await call({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      })) as AppWebhookConfig;
      setConfig(next);
      if (next.configured) setBranch(next.branch);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        "Delete this webhook? GitHub pushes will no longer trigger deploys.",
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      await call({ method: "DELETE" });
      setConfig({ configured: false });
      setJustCreated(null);
      setBranch("main");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (!config.configured) {
    return (
      <section className="surface-card" style={{ padding: 20 }}>
        <div className="type-h3" style={{ marginBottom: 4 }}>
          Connect GitHub
        </div>
        <p
          className="text-[13px]"
          style={{ color: "var(--text-3)", marginBottom: 16 }}
        >
          Generate a webhook URL and shared secret. Add them to your GitHub
          repo and pushes to the chosen branch will redeploy this app.
        </p>
        <label
          className="block text-[12px]"
          style={{ color: "var(--text-2)" }}
        >
          Branch
          <input
            className="field-input"
            style={{ marginTop: 6, maxWidth: 280 }}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
            disabled={busy}
          />
        </label>
        {err && (
          <div
            className="type-mono text-[12px]"
            style={{ marginTop: 12, color: "var(--crit)" }}
          >
            {err}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn-primary"
            onClick={create}
            disabled={busy || !branch.trim()}
          >
            <IconPlus />
            {busy ? "Generating…" : "Generate webhook"}
          </button>
        </div>
      </section>
    );
  }

  const branchDirty = branch !== config.branch;

  return (
    <div className="space-y-4">
      {justCreated && (
        <section
          className="surface-card"
          style={{
            padding: 20,
            borderColor:
              "color-mix(in oklch, var(--warn) 40%, var(--line))",
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{ marginBottom: 10 }}
          >
            <span className="dot" style={{ background: "var(--warn)" }} />
            <div className="type-h3">Save these now</div>
          </div>
          <p
            className="text-[12.5px]"
            style={{ color: "var(--text-3)", marginBottom: 14 }}
          >
            The secret is shown <strong>once</strong>. Add both values to your
            GitHub repo at <em>Settings → Webhooks → Add webhook</em>. Content
            type: <code className="type-mono">application/json</code>.
          </p>
          <div className="space-y-3">
            <div>
              <div
                className="text-[11px] type-mono"
                style={{ color: "var(--text-4)", marginBottom: 4 }}
              >
                PAYLOAD URL
              </div>
              <CopyField value={webhookUrlFor(justCreated.webhook_id)} />
            </div>
            <div>
              <div
                className="text-[11px] type-mono"
                style={{ color: "var(--text-4)", marginBottom: 4 }}
              >
                SECRET
              </div>
              <CopyField value={justCreated.secret} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setJustCreated(null)}
            >
              <IconCheck />
              I&apos;ve saved them
            </button>
          </div>
        </section>
      )}

      <section className="surface-card" style={{ padding: 20 }}>
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 14 }}
        >
          <div className="type-h3">Webhook</div>
          <span className={config.enabled ? "pill-ok" : "pill-muted"}>
            {config.enabled ? "enabled" : "disabled"}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div
              className="text-[11px] type-mono"
              style={{ color: "var(--text-4)", marginBottom: 4 }}
            >
              PAYLOAD URL
            </div>
            <CopyField value={config.webhook_url} />
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <label
              className="block text-[12px]"
              style={{ color: "var(--text-2)" }}
            >
              Branch
              <input
                className="field-input"
                style={{ marginTop: 6, width: 240 }}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => patch({ branch })}
              disabled={busy || !branch.trim() || !branchDirty}
            >
              <IconSave />
              Save branch
            </button>
          </div>

          <div
            className="text-[12px] type-mono"
            style={{ color: "var(--text-3)" }}
          >
            Last delivery: {relTime(config.last_delivery_at)}
          </div>
        </div>

        {err && (
          <div
            className="type-mono text-[12px]"
            style={{ marginTop: 12, color: "var(--crit)" }}
          >
            {err}
          </div>
        )}

        <div
          className="flex items-center gap-2 flex-wrap"
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--line)",
          }}
        >
          <button
            type="button"
            className="btn-ghost"
            onClick={() => patch({ enabled: !config.enabled })}
            disabled={busy}
          >
            {config.enabled ? <IconX /> : <IconCheck />}
            {config.enabled ? "Disable" : "Enable"}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={remove}
            disabled={busy}
            style={{ marginLeft: "auto" }}
          >
            <IconTrash />
            Delete webhook
          </button>
        </div>
      </section>
    </div>
  );
}
