"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconArrowRight, IconCheck, IconX, IconRefresh, IconPlay, IconStop } from "@/components/ui/icons";

type Inventory = {
  tables: number;
  rows: number;
  users: number;
  identities: number;
  policies: number;
  buckets: number;
  bucket_names: string[];
  functions_note?: string;
};

type Include = {
  schema: boolean;
  data: boolean;
  auth: boolean;
  storage: boolean;
};

type Event = {
  ts: string;
  level: "info" | "warn" | "error";
  phase: string;
  message: string;
  progress?: number;
  total?: number;
};

export default function MigrationWizard({ slug }: { slug: string }) {
  // Source creds — never stored, kept in state only for this session.
  const [dbUrl, setDbUrl] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");

  const [inv, setInv] = useState<Inventory | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  const [include, setInclude] = useState<Include>({
    schema: true,
    data: true,
    auth: true,
    storage: true,
  });

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "succeeded" | "failed" | "cancelled">("idle");
  const [events, setEvents] = useState<Event[]>([]);
  const eventsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  async function runInventory() {
    setInvLoading(true);
    setInvError(null);
    setInv(null);
    try {
      const r = await fetch(`/api/customers/${slug}/migrate/inventory`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_db_url: dbUrl, source_api_url: apiUrl, source_service_role_key: serviceRoleKey }),
      });
      const data = (await r.json().catch(() => ({}))) as Inventory & { error?: string };
      if (!r.ok) {
        setInvError(data.error || `HTTP ${r.status}`);
        return;
      }
      setInv(data);
    } catch (e) {
      setInvError(e instanceof Error ? e.message : "network error");
    } finally {
      setInvLoading(false);
    }
  }

  async function startMigration() {
    setEvents([]);
    setStatus("running");
    setJobId(null);
    try {
      const r = await fetch(`/api/customers/${slug}/migrate/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_db_url: dbUrl,
          source_api_url: apiUrl,
          source_service_role_key: serviceRoleKey,
          include,
        }),
      });
      const data = (await r.json()) as { job_id?: string; error?: string };
      if (!r.ok || !data.job_id) {
        setStatus("failed");
        setEvents([{ ts: new Date().toISOString(), level: "error", phase: "start", message: data.error || `HTTP ${r.status}` }]);
        return;
      }
      setJobId(data.job_id);
      // Open SSE
      const es = new EventSource(`/api/customers/${slug}/migrate/stream/${data.job_id}`);
      es.onmessage = (m) => {
        try {
          const evt = JSON.parse(m.data) as Event;
          setEvents((prev) => [...prev, evt]);
        } catch { /* ignore */ }
      };
      es.addEventListener("end", (m) => {
        try {
          const { status: s } = JSON.parse((m as MessageEvent).data) as { status: string };
          setStatus(s as "succeeded" | "failed" | "cancelled");
        } catch { setStatus("succeeded"); }
        es.close();
      });
      es.onerror = () => {
        setStatus((s) => (s === "running" ? "failed" : s));
        es.close();
      };
    } catch (e) {
      setStatus("failed");
      setEvents([{ ts: new Date().toISOString(), level: "error", phase: "start", message: e instanceof Error ? e.message : "network error" }]);
    }
  }

  async function cancelMigration() {
    if (!jobId) return;
    await fetch(`/api/customers/${slug}/migrate/cancel/${jobId}`, { method: "POST" });
  }

  const canInventory = dbUrl && apiUrl && serviceRoleKey;
  const canStart = !!inv && status !== "running";

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-7 py-6 space-y-5">
          <p className="type-eyebrow">§ STEP 1 — SOURCE CREDENTIALS</p>
          <p className="type-mono text-[12.5px]" style={{ color: "var(--text-3)" }}>
            Pulls from a Supabase project (Cloud or self-hosted). Credentials are used in this session only — never stored. The destination is your <code>{slug}</code> instance.
          </p>
          <Field
            label="Source Postgres connection string"
            hint="Settings → Database → Connection string → URI (use postgres role, not pooled)"
          >
            <input
              required
              type="password"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="postgresql://postgres.xxx:password@db.xxx.supabase.co:5432/postgres"
              className="type-mono"
              style={inputStyle}
            />
          </Field>
          <Field
            label="Source project URL"
            hint="Settings → API → Project URL (https://&lt;ref&gt;.supabase.co or your self-hosted URL)"
          >
            <input
              required
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              className="type-mono"
              style={inputStyle}
            />
          </Field>
          <Field
            label="Source service_role key"
            hint="Settings → API → service_role secret. Used for storage + auth admin reads."
          >
            <input
              required
              type="password"
              value={serviceRoleKey}
              onChange={(e) => setServiceRoleKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="type-mono"
              style={inputStyle}
            />
          </Field>
          {invError && (
            <p className="type-mono text-[12px]" style={{ color: "var(--crit)" }}>{invError}</p>
          )}
          <div className="vm-action-group" role="group" aria-label="Inventory">
            <button
              type="button"
              className="vm-action vm-action--view"
              onClick={runInventory}
              disabled={!canInventory || invLoading}
            >
              <IconArrowRight />
              <span>{invLoading ? "Checking source…" : "Inspect source"}</span>
            </button>
          </div>
        </div>
      </Card>

      {inv && (
        <Card>
          <div className="px-7 py-6 space-y-4">
            <p className="type-eyebrow">§ STEP 2 — WHAT TO MIGRATE</p>
            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 14,
                marginTop: 8,
              }}
            >
              <Stat label="Public tables" value={inv.tables} />
              <Stat label="Public rows (est.)" value={inv.rows} />
              <Stat label="Auth users" value={inv.users} />
              <Stat label="RLS policies" value={inv.policies} />
              <Stat label="Storage buckets" value={inv.buckets} />
            </div>
            <div className="space-y-2" style={{ marginTop: 12 }}>
              <Toggle
                label="Schema (tables, indexes, RLS policies)"
                checked={include.schema}
                onChange={(v) => setInclude((i) => ({ ...i, schema: v }))}
              />
              <Toggle
                label="Public-schema data (table rows)"
                checked={include.data}
                onChange={(v) => setInclude((i) => ({ ...i, data: v }))}
              />
              <Toggle
                label="Auth users + identities (passwords carry over)"
                description="Destination auth tables will be TRUNCATEd first, then re-populated from source. Existing destination users will be removed."
                checked={include.auth}
                onChange={(v) => setInclude((i) => ({ ...i, auth: v }))}
              />
              <Toggle
                label="Storage buckets + objects"
                description={inv.buckets > 0 ? `${inv.buckets} bucket(s): ${inv.bucket_names.join(", ")}` : "No buckets on source."}
                checked={include.storage}
                onChange={(v) => setInclude((i) => ({ ...i, storage: v }))}
                disabled={inv.buckets === 0}
              />
            </div>
            {inv.functions_note && (
              <p
                className="type-mono text-[11.5px]"
                style={{ color: "var(--text-4)", paddingTop: 6, borderTop: "1px solid var(--line)" }}
              >
                Note — Edge Functions: {inv.functions_note}
              </p>
            )}
            <div className="vm-action-group" role="group" aria-label="Migrate" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="vm-action vm-action--start"
                onClick={startMigration}
                disabled={!canStart}
              >
                <IconPlay />
                <span>{status === "running" ? "Migration running…" : "Start migration"}</span>
              </button>
              {status === "running" && (
                <button
                  type="button"
                  className="vm-action vm-action--stop"
                  onClick={cancelMigration}
                >
                  <IconStop />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {(status === "running" || events.length > 0) && (
        <Card>
          <div
            className="px-6 py-3 flex items-center justify-between border-b"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow">§ STEP 3 — PROGRESS</span>
            <span
              className="type-mono"
              style={{
                fontSize: 11,
                color:
                  status === "succeeded" ? "var(--ok)" :
                  status === "failed" || status === "cancelled" ? "var(--crit)" :
                  "var(--accent)",
              }}
            >
              {status === "running" && "running…"}
              {status === "succeeded" && "✓ succeeded"}
              {status === "failed" && "× failed"}
              {status === "cancelled" && "cancelled"}
            </span>
          </div>
          <pre
            className="type-mono"
            style={{
              maxHeight: 480,
              overflowY: "auto",
              fontSize: 11.5,
              lineHeight: 1.55,
              padding: "12px 18px",
              background: "var(--surface-1)",
              color: "var(--text)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {events.map((e, i) => (
              <div key={i} style={{ color: e.level === "error" ? "var(--crit)" : e.level === "warn" ? "var(--warn)" : "var(--text-2)" }}>
                <span style={{ color: "var(--text-4)" }}>{new Date(e.ts).toLocaleTimeString()}</span>
                {"  "}
                <span style={{ color: "var(--accent)" }}>[{e.phase}]</span>
                {"  "}
                {e.message}
              </div>
            ))}
            <div ref={eventsEndRef} />
          </pre>
        </Card>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 11px",
  fontSize: 13,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 3,
  color: "var(--text)",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="type-eyebrow" style={{ color: "var(--text-3)", fontSize: 10.5 }}>{label}</span>
      {children}
      {hint && (
        <span className="type-mono text-[11px]" style={{ color: "var(--text-4)" }}>{hint}</span>
      )}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        border: "1px solid var(--line)",
        borderRadius: 3,
        background: "var(--surface)",
      }}
    >
      <div className="type-mono" style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-4)" }}>
        {label}
      </div>
      <div className="type-mono" style={{ fontSize: 20, color: "var(--text)", marginTop: 4 }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className="flex items-start gap-3"
      style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2 }}
      />
      <div>
        <div className="type-mono" style={{ fontSize: 12.5, color: "var(--text)" }}>{label}</div>
        {description && (
          <div className="type-mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            {description}
          </div>
        )}
      </div>
    </label>
  );
}
