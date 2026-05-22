"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import type { DomainCertMetadata } from "@/lib/provisioner/types";

const PEM_CERT = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/;
const PEM_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/;

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
}

function daysUntil(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : null;
}

export default function CertManager({
  slug,
  appId,
  hostname,
}: {
  slug: string;
  appId: string;
  hostname: string;
}) {
  const [meta, setMeta] = useState<DomainCertMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [cert, setCert] = useState("");
  const [key, setKey] = useState("");
  const [chain, setChain] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const url = `/api/customers/${slug}/apps/${appId}/domains/${encodeURIComponent(hostname)}/cert`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setMeta((await res.json()) as DomainCertMetadata);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!PEM_CERT.test(cert)) {
      setError("Certificate must be PEM-encoded (BEGIN/END CERTIFICATE).");
      return;
    }
    if (!PEM_KEY.test(key)) {
      setError("Private key must be PEM-encoded (BEGIN/END PRIVATE KEY).");
      return;
    }
    if (chain.trim().length > 0 && !PEM_CERT.test(chain)) {
      setError("Chain must contain PEM-encoded certificates, or be empty.");
      return;
    }
    setUploading(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cert_pem: cert,
          key_pem: key,
          chain_pem: chain.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setMeta((await res.json()) as DomainCertMetadata);
      setOkMsg("Certificate uploaded.");
      setCert("");
      setKey("");
      setChain("");
      setTimeout(() => setOkMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setUploading(false);
    }
  }

  async function onRemove() {
    if (!confirm(`Remove BYO certificate for ${hostname}?`)) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRemoving(false);
    }
  }

  const expiresIn = daysUntil(meta?.not_after);

  return (
    <div className="space-y-6">
      {meta?.uploaded && (
        <Card>
          <div
            className="px-6 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow">§ CURRENT CERTIFICATE</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRemove}
              disabled={removing}
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
          <dl className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 type-mono text-[12px]">
            <div className="flex flex-col">
              <dt className="type-eyebrow text-[10px]" style={{ color: "var(--color-muted)" }}>
                Subject
              </dt>
              <dd style={{ wordBreak: "break-all" }}>{meta.subject || "—"}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="type-eyebrow text-[10px]" style={{ color: "var(--color-muted)" }}>
                Uploaded
              </dt>
              <dd>{fmtDate(meta.uploaded_at)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="type-eyebrow text-[10px]" style={{ color: "var(--color-muted)" }}>
                Not before
              </dt>
              <dd>{fmtDate(meta.not_before)}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="type-eyebrow text-[10px]" style={{ color: "var(--color-muted)" }}>
                Not after
              </dt>
              <dd
                style={{
                  color:
                    expiresIn !== null && expiresIn < 14
                      ? "var(--color-danger, #b03020)"
                      : expiresIn !== null && expiresIn < 30
                      ? "var(--color-warning, #b07020)"
                      : undefined,
                }}
              >
                {fmtDate(meta.not_after)}
                {expiresIn !== null && ` · ${expiresIn}d`}
              </dd>
            </div>
            <div className="flex flex-col sm:col-span-2">
              <dt className="type-eyebrow text-[10px]" style={{ color: "var(--color-muted)" }}>
                SHA-256 fingerprint
              </dt>
              <dd style={{ wordBreak: "break-all" }}>{meta.fingerprint_sha256 || "—"}</dd>
            </div>
            <div className="flex flex-col">
              <dt className="type-eyebrow text-[10px]" style={{ color: "var(--color-muted)" }}>
                Chain
              </dt>
              <dd>{meta.has_chain ? "included" : "not provided"}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card>
        <div
          className="px-6 py-3 border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">
            § {meta?.uploaded ? "REPLACE CERTIFICATE" : "UPLOAD CERTIFICATE"}
          </span>
        </div>
        <form onSubmit={onUpload} className="px-6 py-5 space-y-4">
          {loading && (
            <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              Loading…
            </p>
          )}
          <label className="block space-y-1">
            <span className="type-eyebrow text-[10px]">Certificate (cert.pem)</span>
            <textarea
              value={cert}
              onChange={(e) => setCert(e.target.value)}
              rows={6}
              placeholder="-----BEGIN CERTIFICATE-----&#10;…&#10;-----END CERTIFICATE-----"
              className="w-full type-mono text-[11px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
            />
          </label>
          <label className="block space-y-1">
            <span className="type-eyebrow text-[10px]">Private key (key.pem)</span>
            <textarea
              value={key}
              onChange={(e) => setKey(e.target.value)}
              rows={6}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;…&#10;-----END PRIVATE KEY-----"
              className="w-full type-mono text-[11px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
            />
          </label>
          <label className="block space-y-1">
            <span className="type-eyebrow text-[10px]">
              Chain (chain.pem) · optional
            </span>
            <textarea
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              rows={5}
              placeholder="Intermediate certificates, if your CA provides them."
              className="w-full type-mono text-[11px] px-3 py-2"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
              }}
            />
          </label>
          {error && (
            <p
              className="type-mono text-[12px]"
              style={{ color: "var(--color-danger, #b03020)" }}
            >
              {error}
            </p>
          )}
          {okMsg && (
            <p
              className="type-mono text-[12px]"
              style={{ color: "var(--color-success, #2f6b3a)" }}
            >
              {okMsg}
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
              {uploading ? "Uploading…" : meta?.uploaded ? "Replace" : "Upload"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
