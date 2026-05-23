"use client";

import { useEffect, useState } from "react";

type Probe = {
  state: "online" | "offline" | "rebooting" | "checking";
  status: number | null;
  latency_ms: number | null;
  checked_at: string | null;
};

const INITIAL: Probe = {
  state: "checking",
  status: null,
  latency_ms: null,
  checked_at: null,
};

function tone(state: Probe["state"]) {
  if (state === "online")
    return { color: "var(--ok)", label: "Online", pill: "pill-ok" };
  if (state === "rebooting")
    return { color: "var(--warn)", label: "Rebooting", pill: "pill-warn" };
  if (state === "offline")
    return { color: "var(--crit)", label: "Offline", pill: "pill-crit" };
  return { color: "var(--text-3)", label: "Checking…", pill: "pill-muted" };
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

export default function HealthPanel({
  slug,
  apex,
}: {
  slug: string;
  apex: string;
}) {
  const healthz = `https://${apex}/healthz`;
  const [probe, setProbe] = useState<Probe>(INITIAL);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/customers/${slug}/health/probe`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Probe;
        if (alive) setProbe(data);
      } catch {
        if (alive)
          setProbe({
            state: "offline",
            status: null,
            latency_ms: null,
            checked_at: new Date().toISOString(),
          });
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [slug]);

  const t = tone(probe.state);

  return (
    <section
      className="surface-card"
      style={{ padding: 0, overflow: "hidden" }}
    >
      <div
        className="flex items-center gap-4 flex-wrap"
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          aria-hidden
          className={`heartbeat-dot${probe.state === "online" ? "" : " is-static"}`}
          style={{ ["--hb" as string]: t.color }}
        />
        <div
          style={{
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          {t.label}
        </div>
        <span className={t.pill} style={{ marginLeft: 4 }}>
          {probe.status != null ? `HTTP ${probe.status}` : "—"}
        </span>
        <span
          className="type-mono"
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          polled every 5s · {relTime(probe.checked_at)}
        </span>
      </div>
      <dl
        className="grid"
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          padding: "18px 22px",
          gap: "0 32px",
        }}
      >
        <Field label="Endpoint">
          <a
            href={healthz}
            target="_blank"
            rel="noopener noreferrer"
            className="type-mono"
            style={{
              fontSize: 12.5,
              color: "var(--brand)",
              textDecoration: "none",
              borderBottom: "1px dashed color-mix(in oklch, var(--brand) 40%, transparent)",
            }}
          >
            {healthz.replace(/^https?:\/\//, "")}
          </a>
        </Field>
        <Field label="Latency">
          <span
            className="type-mono"
            style={{ fontSize: 13, color: "var(--text)" }}
          >
            {probe.latency_ms != null ? `${probe.latency_ms} ms` : "—"}
          </span>
        </Field>
        <Field label="Last check">
          <span
            className="type-mono"
            style={{ fontSize: 13, color: "var(--text)" }}
          >
            {probe.checked_at
              ? new Date(probe.checked_at).toLocaleTimeString()
              : "—"}
          </span>
        </Field>
      </dl>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt
        className="type-mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-4)",
          marginBottom: 6,
        }}
      >
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
