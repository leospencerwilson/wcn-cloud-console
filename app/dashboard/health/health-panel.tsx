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

const BAR_SLOTS = 60;
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
  slug,
}: {
  slug: string;
}) {
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

  // Recent latency stats — last 60 probes, p50 / p95 / max
  const latencyStats = (() => {
    const nums = samples
      .map((s) => s.ms)
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => a - b);
    if (nums.length === 0) return null;
    const pick = (p: number) => nums[Math.min(nums.length - 1, Math.floor(p * nums.length))];
    return { p50: pick(0.5), p95: pick(0.95), max: nums[nums.length - 1] };
  })();

  return (
    <section className="surface-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Status strip */}
      <div
        className="flex items-center gap-4 flex-wrap"
        style={{ padding: "20px 28px", borderBottom: "1px solid var(--line)" }}
      >
        <span
          aria-hidden
          className={`heartbeat-dot${probe.state === "offline" ? " is-static" : ""}`}
          style={{ ["--hb" as string]: t.color }}
        />
        <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.01em" }}>
          {t.label}
        </div>
      </div>

      {/* Dramatic latency panel — fills the room beneath the status strip */}
      <div style={{ padding: "36px 28px 32px 28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, auto) 1fr",
            alignItems: "center",
            gap: 36,
          }}
        >
          {/* Oversized current latency readout */}
          <div>
            <div
              className="type-mono"
              style={{
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-4)",
                marginBottom: 6,
              }}
            >
              Current latency
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 200,
                lineHeight: 1,
                color: probe.latency_ms == null ? "var(--text-4)" : "var(--text)",
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {probe.latency_ms ?? "—"}
              {probe.latency_ms != null && (
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 300,
                    color: "var(--text-3)",
                    marginLeft: 8,
                  }}
                >
                  ms
                </span>
              )}
            </div>
            {probe.checked_at && (
              <div
                className="type-mono"
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  marginTop: 8,
                }}
              >
                last check {new Date(probe.checked_at).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Full-width sparkline */}
          {samples.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <LatencyBars samples={samples} />
              {latencyStats && (
                <div
                  className="type-mono"
                  style={{
                    display: "flex",
                    gap: 22,
                    fontSize: 11.5,
                    color: "var(--text-3)",
                  }}
                >
                  <span>
                    <span style={{ color: "var(--text-4)" }}>p50 </span>
                    {latencyStats.p50}ms
                  </span>
                  <span>
                    <span style={{ color: "var(--text-4)" }}>p95 </span>
                    {latencyStats.p95}ms
                  </span>
                  <span>
                    <span style={{ color: "var(--text-4)" }}>max </span>
                    {latencyStats.max}ms
                  </span>
                  <span>
                    <span style={{ color: "var(--text-4)" }}>samples </span>
                    {samples.length}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="type-mono"
              style={{
                fontSize: 12,
                color: "var(--text-4)",
                fontStyle: "italic",
              }}
            >
              waiting for the first probe…
            </div>
          )}
        </div>
      </div>
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
      style={{ height: 110, gap: 3, width: "100%" }}
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
            style={{ height: `${(ratio * 100).toFixed(0)}%`, flex: 1 }}
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
