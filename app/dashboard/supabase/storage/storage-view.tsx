"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconPlus, IconRefresh, IconTrash, IconX, IconCheck, IconUpload } from "@/components/ui/icons";
import type {
  StorageBucket,
  StorageObject,
  StorageObjectsResp,
} from "@/lib/provisioner/supabase-client";

const PAGE_SIZE = 100;

function fmtBytes(b: number | null): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export default function StorageView({ slug }: { slug: string }) {
  const [buckets, setBuckets] = useState<StorageBucket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/storage/buckets`, { cache: "no-store" });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${res.status}`);
      } else {
        const list = (await res.json()) as StorageBucket[];
        setBuckets(list);
        if (!selectedBucket && list.length > 0) setSelectedBucket(list[0].name);
        else if (selectedBucket && !list.find((b) => b.name === selectedBucket)) {
          setSelectedBucket(list[0]?.name ?? null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, selectedBucket]);

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slug]);

  async function onDeleteBucket(name: string) {
    if (!confirm(`Delete bucket "${name}"? All objects inside will be deleted first. This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(`/api/customers/${slug}/supabase/storage/buckets/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      setError(e.error || `Delete failed (${res.status})`);
    } else {
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">
            § BUCKETS
            {buckets && <span style={{ color: "var(--text-3)", marginLeft: 10 }}>{buckets.length}</span>}
          </span>
          <div className="vm-action-group" role="group" aria-label="Bucket actions">
            <button type="button" className="vm-action vm-action--view" onClick={refresh} disabled={loading}>
              <IconRefresh />
              <span>{loading ? "Refreshing…" : "Refresh"}</span>
            </button>
            <button
              type="button"
              className="vm-action vm-action--start"
              onClick={() => setCreating(true)}
              title="Create a new storage bucket"
            >
              <IconPlus />
              <span>New bucket</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="px-6 py-3 type-mono text-[12px]" style={{ color: "var(--crit)", borderBottom: "1px solid var(--line)" }}>
            {error}
          </div>
        )}

        {!buckets ? (
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
        ) : buckets.length === 0 ? (
          <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
            (no buckets yet — click New bucket to create one)
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Public", "Objects", "Total size", "Created", ""].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buckets.map((b) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      background: selectedBucket === b.name ? "color-mix(in oklch, var(--brand) 8%, transparent)" : undefined,
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedBucket(b.name)}
                  >
                    <Td><strong style={{ color: "var(--text)" }}>{b.name}</strong></Td>
                    <Td muted>{b.public ? "public" : "private"}</Td>
                    <Td muted>{b.object_count.toLocaleString()}</Td>
                    <Td muted>{fmtBytes(b.total_bytes)}</Td>
                    <Td muted>{new Date(b.created_at).toLocaleDateString()}</Td>
                    <Td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); onDeleteBucket(b.name); }}
                        style={{ color: "var(--crit)" }}
                        title="Delete bucket"
                      >
                        <IconTrash />
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedBucket && <ObjectsTable slug={slug} bucket={selectedBucket} onChange={refresh} />}

      {creating && (
        <CreateBucketDialog
          slug={slug}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); refresh(); }}
        />
      )}
    </div>
  );
}

function ObjectsTable({
  slug,
  bucket,
  onChange,
}: {
  slug: string;
  bucket: string;
  onChange: () => void;
}) {
  const [resp, setResp] = useState<StorageObjectsResp | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setOffset(0); }, [bucket]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/customers/${slug}/supabase/storage/objects?bucket=${encodeURIComponent(bucket)}&limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" },
      );
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { error?: string };
        setError(e.error || `HTTP ${r.status}`);
        setResp(null);
      } else {
        setResp((await r.json()) as StorageObjectsResp);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [slug, bucket, offset]);

  useEffect(() => { refresh(); }, [refresh]);

  async function onDeleteObject(name: string) {
    if (!confirm(`Delete object "${name}"? This cannot be undone.`)) return;
    setError(null);
    const res = await fetch(
      `/api/customers/${slug}/supabase/storage/objects?bucket=${encodeURIComponent(bucket)}&name=${encodeURIComponent(name)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      setError(e.error || `Delete failed (${res.status})`);
    } else {
      refresh();
      onChange();
    }
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<{ name: string; done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFiles(files: FileList | File[]) {
    if (!files || files.length === 0) return;
    setError(null);
    for (let i = 0; i < files.length; i++) {
      const f = (files as FileList)[i] ?? (files as File[])[i];
      setUploading({ name: f.name, done: i, total: files.length });
      try {
        const r = await fetch(
          `/api/customers/${slug}/supabase/storage/objects/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(f.name)}`,
          {
            method: "POST",
            headers: { "content-type": f.type || "application/octet-stream" },
            body: f,
          },
        );
        if (!r.ok) {
          const e = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(e.error || e.message || `HTTP ${r.status}`);
        }
      } catch (e) {
        setError(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`);
        setUploading(null);
        return;
      }
    }
    setUploading(null);
    refresh();
    onChange();
  }

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between border-b gap-3 flex-wrap"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">
          § OBJECTS IN {bucket.toUpperCase()}
          {resp && <span style={{ color: "var(--text-3)", marginLeft: 10 }}>{resp.total} total</span>}
          {uploading && (
            <span className="type-mono" style={{ color: "var(--accent)", marginLeft: 14, fontSize: 11 }}>
              uploading {uploading.name} ({uploading.done + 1}/{uploading.total})…
            </span>
          )}
        </span>
        <div className="vm-action-group" role="group" aria-label="Object actions">
          <button
            type="button"
            className="vm-action vm-action--start"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploading}
          >
            <IconUpload />
            <span>Upload files</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const fs = e.currentTarget.files;
            if (fs && fs.length > 0) uploadFiles(fs);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) uploadFiles(files);
        }}
        style={{
          padding: dragOver ? 18 : 6,
          borderBottom: "1px solid var(--color-hairline)",
          background: dragOver ? "color-mix(in oklch, var(--accent) 8%, transparent)" : undefined,
          textAlign: "center",
          color: dragOver ? "var(--accent)" : "var(--text-4)",
          fontSize: dragOver ? 13 : 11,
          fontStyle: "italic",
          transition: "padding .12s",
        }}
      >
        {dragOver ? `↓ Drop here to upload to ${bucket}` : `Drag files anywhere here to upload`}
      </div>
      {error ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--crit)" }}>{error}</div>
      ) : loading && !resp ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>Loading…</div>
      ) : !resp || resp.objects.length === 0 ? (
        <div className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--text-3)" }}>
          (no objects in this bucket — click Upload files or drag-and-drop above)
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Size", "Type", "Updated", ""].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resp.objects.map((o) => (
                <ObjectRow key={`${o.bucket_id}/${o.name}`} o={o} onDelete={() => onDeleteObject(o.name)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resp && resp.total > PAGE_SIZE && (
        <div
          className="px-6 py-3 flex items-center justify-between gap-3 border-t"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-mono text-[11px]" style={{ color: "var(--text-3)" }}>
            {Math.min(resp.total, offset + 1)} – {Math.min(resp.total, offset + resp.objects.length)} of {resp.total}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={loading || offset === 0}>← Prev</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={loading || offset + PAGE_SIZE >= resp.total}>Next →</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ObjectRow({ o, onDelete }: { o: StorageObject; onDelete: () => void }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <Td><span className="type-mono" style={{ fontSize: 12 }}>{o.name}</span></Td>
      <Td muted>{fmtBytes(o.size_bytes)}</Td>
      <Td muted>{o.mime_type ?? "—"}</Td>
      <Td muted>{new Date(o.updated_at).toLocaleString()}</Td>
      <Td>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onDelete}
          style={{ color: "var(--crit)" }}
          title="Delete object"
        >
          <IconTrash />
        </button>
      </Td>
    </tr>
  );
}

function CreateBucketDialog({
  slug,
  onClose,
  onCreated,
}: {
  slug: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [isPublic, setPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/supabase/storage/buckets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), public: isPublic }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        setError(data.error || data.message || `Create failed (${res.status})`);
        return;
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New bucket" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <FormField label="Name (lowercase letters, digits, . _ -)">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="type-mono"
            style={inputStyle}
            placeholder="my-bucket"
            pattern="[a-z0-9][a-z0-9._-]*"
          />
        </FormField>
        <label className="flex items-center gap-2 type-mono text-[12px]" style={{ color: "var(--text-2)" }}>
          <input type="checkbox" checked={isPublic} onChange={(e) => setPublic(e.target.checked)} />
          Public bucket (objects served without auth)
        </label>
        {error && (
          <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>{error}</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}><IconX />Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            <IconCheck />{saving ? "Creating…" : "Create bucket"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "7px 10px",
  fontSize: 13,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 3,
  color: "var(--text)",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-3)",
  borderBottom: "1px solid var(--line)",
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="type-eyebrow" style={{ color: "var(--text-3)", marginBottom: 6, fontSize: 10.5 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="px-7 py-6 space-y-5">
            <p className="type-eyebrow">§ {title.toUpperCase()}</p>
            {children}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td
      style={{
        padding: "8px 12px",
        fontSize: 12,
        color: muted ? "var(--text-3)" : "var(--text)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </td>
  );
}
