"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type Probe = {
  state: "online" | "offline" | "rebooting" | "checking";
  latencyMs: number | null;
  checkedAt: number | null;
};

const INITIAL: Probe = { state: "checking", latencyMs: null, checkedAt: null };

async function probe(url: string): Promise<Probe> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2000);
  const start = performance.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "manual",
    });
    const ms = Math.round(performance.now() - start);
    if (res.ok) return { state: "online", latencyMs: ms, checkedAt: Date.now() };
    if (res.status === 502 || res.status === 503)
      return { state: "rebooting", latencyMs: ms, checkedAt: Date.now() };
    return { state: "offline", latencyMs: ms, checkedAt: Date.now() };
  } catch {
    return { state: "offline", latencyMs: null, checkedAt: Date.now() };
  } finally {
    clearTimeout(t);
  }
}

function dotClass(state: Probe["state"]) {
  if (state === "online") return "dot dot-online";
  if (state === "rebooting") return "dot dot-rebooting";
  if (state === "offline") return "dot dot-offline";
  return "dot";
}

function label(state: Probe["state"]) {
  if (state === "online") return "Online";
  if (state === "rebooting") return "Rebooting";
  if (state === "offline") return "Offline";
  return "Checking…";
}

export default function HealthPanel({ apex }: { apex: string }) {
  const healthz = `https://${apex}/healthz`;
  const [probeResult, setProbeResult] = useState<Probe>(INITIAL);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const next = await probe(healthz);
      if (alive) setProbeResult(next);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [healthz]);

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2">§ HEALTH</h2>
        <span className="type-meta">Polled every 5s from your browser</span>
      </div>
      <Card>
        <div className="px-8 py-8 space-y-7">
          <div className="flex items-center gap-4">
            <span className={dotClass(probeResult.state)} />
            <span
              className="text-[20px] font-medium"
              style={{ color: "var(--color-charcoal)" }}
            >
              {label(probeResult.state)}
            </span>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-7">
            <div>
              <dt className="type-eyebrow mb-3">§ ENDPOINT</dt>
              <dd className="type-mono text-[13px]">
                <a
                  href={healthz}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-navy)" }}
                >
                  {healthz.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
            <div>
              <dt className="type-eyebrow mb-3">§ LATENCY</dt>
              <dd className="type-mono text-[14px]">
                {probeResult.latencyMs != null
                  ? `${probeResult.latencyMs} ms`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="type-eyebrow mb-3">§ LAST CHECK</dt>
              <dd className="type-mono text-[14px]">
                {probeResult.checkedAt
                  ? new Date(probeResult.checkedAt).toLocaleTimeString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </Card>
    </div>
  );
}
