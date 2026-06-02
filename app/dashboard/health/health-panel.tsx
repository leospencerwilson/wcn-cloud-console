"use client";

import { useEffect, useRef, useState } from "react";

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

// Probe the public site directly from the browser — same mechanism the admin
// health tab uses, so the result reflects real reachability.
async function probeHealthz(url: string): Promise<Probe> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  const start = performance.now();
  const checked_at = new Date().toISOString();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "manual",
    });
    const ms = Math.round(performance.now() - start);
    if (res.ok)
      return { state: "online", status: res.status, latency_ms: ms, checked_at };
    if (res.status === 502 || res.status === 503)
      return { state: "rebooting", status: res.status, latency_ms: ms, checked_at };
    return {
      state: "offline",
      status: res.status || null,
      latency_ms: ms,
      checked_at,
    };
  } catch {
    return { state: "offline", status: null, latency_ms: null, checked_at };
  } finally {
    clearTimeout(timer);
  }
}

const BAR_SLOTS = 14;
const LATENCY_MAX_MS = 400;

function tone(state: Probe["state"]) {
  if (state === "online")
    return { color: "var(--ok)", label: "Online", pill: "pill-ok" };
  if (state === "rebooting")
    return { color: "var(--warn)", label: "Rebooting", pill: "pill-warn" };
  if (state === "offline")
    return { color: "var(--crit)", label: "Offline", pill: "pill-crit" };
  return { color: "var(--text-3)", label: "Checking…", pill: "pill-muted" };
}

function latencyTone(ms: number | null): "ok" | "warn" | "crit" {
  if (ms == null) return "crit";
  if (ms < 100) return "ok";
  if (ms < 300) return "warn";
  return "crit";
}

export default function HealthPanel({ apex }: { apex: string }) {
  const healthz = `https://${apex}/healthz`;
  const [probe, setProbe] = useState<Probe>(INITIAL);
  const [samples, setSamples] = useState<
    { id: number; ms: number | null }[]
  >([]);
  const lastChecked = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const data = await probeHealthz(healthz);
      if (alive) setProbe(data);
    };
    tick();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [healthz]);

  useEffect(() => {
    if (!probe.checked_at || probe.checked_at === lastChecked.current) return;
    lastChecked.current = probe.checked_at;
    setSamples((prev) => {
      const next = [...prev, { id: Date.now(), ms: probe.latency_ms }];
      return next.length > BAR_SLOTS ? next.slice(-BAR_SLOTS) : next;
    });
  }, [probe.checked_at, probe.latency_ms]);

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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "flex-start",
            }}
          >
            <LatencyBars samples={samples} />
            <span
              className="type-mono"
              style={{ fontSize: 12, color: "var(--text-3)" }}
            >
              {probe.latency_ms != null ? `${probe.latency_ms} ms` : "—"}
            </span>
          </div>
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

function LatencyBars({
  samples,
}: {
  samples: { id: number; ms: number | null }[];
}) {
  const offset = BAR_SLOTS - samples.length;
  return (
    <div
      className="latency-bars"
      role="img"
      aria-label={`Recent latency, last ${samples.length} probes`}
    >
      {Array.from({ length: BAR_SLOTS }, (_, i) => {
        const sample = samples[i - offset];
        if (!sample) {
          return <span key={`idle-${i}`} className="latency-bar is-idle" />;
        }
        const t = latencyTone(sample.ms);
        const ratio =
          sample.ms == null
            ? 0.55
            : Math.min(1, Math.max(0.05, sample.ms / LATENCY_MAX_MS));
        return (
          <span
            key={sample.id}
            className={`latency-bar latency-bar--${t}`}
            style={{ height: `${(ratio * 100).toFixed(0)}%` }}
          />
        );
      })}
    </div>
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
