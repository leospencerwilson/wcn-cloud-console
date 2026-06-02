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

const BAR_SLOTS = 14;
const LATENCY_MAX_MS = 400;
const PROBE_INTERVAL_MS = 5000;

// Probe via the server-side proxy. A direct browser fetch to the customer
// apex would fail CORS — Caddy on the VM doesn't emit Access-Control-Allow-*
// headers, so the cross-origin call from console.* always errors out and
// the panel read "Offline" even when the site was up. The Next.js route
// runs the probe Node-side, follows redirects, and returns a normalised
// { state, status, latency_ms, checked_at } object.
async function probeHealthz(slug: string): Promise<Probe> {
  try {
    const res = await fetch(`/api/customers/${slug}/health/probe`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        state: "offline",
        status: null,
        latency_ms: null,
        checked_at: new Date().toISOString(),
      };
    }
    return (await res.json()) as Probe;
  } catch {
    return {
      state: "offline",
      status: null,
      latency_ms: null,
      checked_at: new Date().toISOString(),
    };
  }
}

function tone(state: Probe["state"]) {
  if (state === "online")
    return { color: "var(--ok)", label: "Online", pill: "pill-ok" };
  if (state === "rebooting")
    return { color: "var(--warn)", label: "Rebooting", pill: "pill-warn" };
  if (state === "offline")
    return { color: "var(--crit)", label: "Offline", pill: "pill-crit" };
  // checking — pulsing yellow until the first probe returns
  return { color: "var(--warn)", label: "Checking…", pill: "pill-warn" };
}

function latencyTone(ms: number | null): "ok" | "warn" | "crit" {
  if (ms == null) return "crit";
  if (ms < 100) return "ok";
  if (ms < 300) return "warn";
  return "crit";
}

export default function HealthPanel({
  apex,
  slug,
}: {
  apex: string;
  slug: string;
}) {
  const healthz = `https://${apex}/healthz`;
  const [probe, setProbe] = useState<Probe>(INITIAL);
  const [samples, setSamples] = useState<{ id: number; ms: number | null }[]>([]);
  const lastChecked = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const data = await probeHealthz(slug);
      if (alive) setProbe(data);
    };
    tick();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") tick();
    }, PROBE_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [slug]);

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
    <section className="surface-card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        className="flex items-center gap-4 flex-wrap"
        style={{ padding: "18px 22px", borderBottom: "1px solid var(--line)" }}
      >
        <span
          aria-hidden
          className={`heartbeat-dot${probe.state === "offline" ? " is-static" : ""}`}
          style={{ ["--hb" as string]: t.color }}
        />
        <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {t.label}
        </div>
        {probe.status != null && (
          <span className={t.pill} style={{ marginLeft: 4 }}>
            HTTP {probe.status}
          </span>
        )}
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
              borderBottom:
                "1px dashed color-mix(in oklch, var(--brand) 40%, transparent)",
            }}
          >
            {healthz.replace(/^https?:\/\//, "")}
          </a>
        </Field>

        {samples.length > 0 && (
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
              {probe.latency_ms != null && (
                <span
                  className="type-mono"
                  style={{ fontSize: 12, color: "var(--text-3)" }}
                >
                  {probe.latency_ms} ms
                </span>
              )}
            </div>
          </Field>
        )}

        {probe.checked_at && (
          <Field label="Last check">
            <span
              className="type-mono"
              style={{ fontSize: 13, color: "var(--text)" }}
            >
              {new Date(probe.checked_at).toLocaleTimeString()}
            </span>
          </Field>
        )}
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
