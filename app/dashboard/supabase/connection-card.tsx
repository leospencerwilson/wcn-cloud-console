"use client";

import { useEffect, useState } from "react";
import { IconCopy, IconExternal, IconEye, IconEyeOff } from "@/components/ui/icons";
import type { SupabaseConnection } from "@/lib/provisioner/types";

type PoolerMode = "transaction" | "session" | "direct";

const POOLER_OPTIONS: {
  mode: PoolerMode;
  label: string;
  hint: string;
  key: keyof SupabaseConnection["connection_strings"];
}[] = [
  {
    mode: "transaction",
    label: "Transaction pooler",
    hint: "Recommended for most apps",
    key: "pooler_transaction",
  },
  {
    mode: "session",
    label: "Session pooler",
    hint: "When you need session state",
    key: "pooler_session",
  },
  {
    mode: "direct",
    label: "Direct connection",
    hint: "For migrations only",
    key: "direct_external",
  },
];

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="vm-action vm-action--view"
      style={{ padding: "4px 10px", fontSize: 11 }}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      <IconCopy />
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function maskPassword(uri: string): string {
  return uri.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/, "$1••••••••$2");
}

function Row({
  label,
  value,
  openable,
}: {
  label: string;
  value: string;
  openable?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: "10px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        className="type-mono"
        style={{
          width: 90,
          fontSize: 10.5,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-4)",
        }}
      >
        {label}
      </div>
      <code
        className="type-mono"
        style={{
          flex: 1,
          fontSize: 12,
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </code>
      <div className="vm-action-group" role="group" aria-label={`${label} actions`}>
        {openable && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="vm-action vm-action--restart"
            style={{ padding: "4px 10px", fontSize: 11, textDecoration: "none" }}
          >
            <IconExternal />
            <span>Open</span>
          </a>
        )}
        <CopyBtn value={value} />
      </div>
    </div>
  );
}

export default function ConnectionCard({ slug }: { slug: string }) {
  const [data, setData] = useState<SupabaseConnection | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pooler, setPooler] = useState<PoolerMode>("transaction");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/customers/${slug}/supabase/connection`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || `${r.status}`);
        }
        return r.json();
      })
      .then((d: SupabaseConnection) => alive && setData(d))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "failed"));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (err) {
    return (
      <section className="surface-card" style={{ padding: 20 }}>
        <div className="type-h3" style={{ marginBottom: 6 }}>
          Connection
        </div>
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--crit)" }}
        >
          {err}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="surface-card" style={{ padding: 20 }}>
        <div className="type-h3" style={{ marginBottom: 6 }}>
          Connection
        </div>
        <div
          className="type-mono text-[12px]"
          style={{ color: "var(--text-3)" }}
        >
          Loading…
        </div>
      </section>
    );
  }

  const selectedOption =
    POOLER_OPTIONS.find((o) => o.mode === pooler) ?? POOLER_OPTIONS[0];
  const rawConn =
    (data.connection_strings as Record<string, string | undefined>)[
      selectedOption.key
    ] ?? "";
  const displayConn = showPw ? rawConn : maskPassword(rawConn);

  return (
    <section className="surface-card" style={{ padding: "18px 22px" }}>
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: 8 }}
      >
        <div className="type-h3">Connection</div>
        {!data.password_known && (
          <span className="pill-warn">password unknown</span>
        )}
      </div>

      <Row label="Studio" value={data.studio_url} openable />
      <Row label="REST" value={data.rest_url} />
      <Row label="Realtime" value={data.realtime_url} />
      <Row label="Storage" value={data.storage_url} />
      <Row label="Auth" value={data.auth_url} />

      <div
        className="type-eyebrow"
        style={{ marginTop: 18, marginBottom: 10 }}
      >
        § POSTGRES — PICK ONE
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {POOLER_OPTIONS.map((opt) => {
          const active = opt.mode === pooler;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setPooler(opt.mode)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                border: active
                  ? "1px solid var(--brand)"
                  : "1px solid var(--line)",
                borderRadius: "var(--r-2)",
                background: active
                  ? "color-mix(in oklch, var(--brand) 10%, var(--surface))"
                  : "var(--surface)",
                cursor: "pointer",
                color: "var(--text)",
              }}
            >
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 4 }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: active ? "var(--brand)" : "transparent",
                  }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>
                  {opt.label}
                </span>
              </div>
              <div
                className="type-mono"
                style={{ fontSize: 10.5, color: "var(--text-3)" }}
              >
                {opt.hint}
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="flex items-center gap-2"
        style={{
          padding: "8px 10px",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-2)",
          background: "var(--bg-2)",
        }}
      >
        <code
          className="type-mono"
          style={{
            flex: 1,
            fontSize: 11.5,
            color: "var(--text-2)",
            overflow: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {data.password_known ? displayConn : rawConn.replace(/:[^@]+@/, ":[your-password]@")}
        </code>
        <div className="vm-action-group" role="group" aria-label="Connection actions">
          {data.password_known && (
            <button
              type="button"
              className="vm-action vm-action--view"
              style={{ padding: "4px 10px", fontSize: 11 }}
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? <IconEyeOff /> : <IconEye />}
              <span>{showPw ? "Hide" : "Show"}</span>
            </button>
          )}
          <CopyBtn value={rawConn} />
        </div>
      </div>

      {!data.password_known && (
        <p
          className="type-mono text-[11px]"
          style={{ marginTop: 10, color: "var(--warn)" }}
        >
          The Postgres password is not recorded for this customer. Replace{" "}
          <code>[your-password]</code> manually, or contact WCN to reset.
        </p>
      )}

      {data.note && (
        <p
          className="text-[12px]"
          style={{ marginTop: 10, color: "var(--text-3)" }}
        >
          {data.note}
        </p>
      )}
    </section>
  );
}
