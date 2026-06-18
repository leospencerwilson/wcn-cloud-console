"use client";

import { useEffect, useState } from "react";

interface Comp {
  component: string;
  status: string; // "ok" | "fail" | (anything else → unknown)
  detail?: string;
}

// Components shown before the first result lands (so the panel has structure).
const PLACEHOLDER = [
  "VM networking",
  "Docker",
  "Coolify",
  "Caddy",
  "cloudflared",
  "DNS",
  "Tunnel",
  "Supabase Studio",
  "node-exporter",
  "cAdvisor",
  "Prometheus targets",
].map((component) => ({ component, status: "unknown" }) as Comp);

export function CustomerHealthPanel({ slug }: { slug: string }) {
  const [comps, setComps] = useState<Comp[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch(`/api/customers/${slug}/health`, { cache: "no-store" });
      const d = (await r.json()) as { components?: Comp[]; checked_at?: string };
      if (Array.isArray(d.components) && d.components.length) {
        setComps(d.components);
        setCheckedAt(d.checked_at ?? new Date().toISOString());
      }
    } catch {
      /* leave previous state; dots fall back to unknown */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [slug]);

  function Dot({ status }: { status: string }) {
    const resolved = comps !== null && !loading;
    let color = "#e0b341"; // unknown → amber
    let pulse = true;
    if (resolved && status === "ok") {
      color = "#46c46a"; // green
      pulse = false;
    } else if (resolved && status === "fail") {
      color = "#ff6b6b"; // red
      pulse = false;
    }
    return (
      <span
        aria-label={resolved ? status : "unknown"}
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          flex: "0 0 auto",
          animation: pulse ? "wcn-hpulse 1.3s ease-in-out infinite" : "none",
        }}
      />
    );
  }

  const rows = comps ?? PLACEHOLDER;

  return (
    <div
      className="px-6 py-4"
      style={{ background: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="type-eyebrow" style={{ color: "var(--color-muted)" }}>
          Health
        </p>
        <div className="flex items-center gap-3">
          {checkedAt && (
            <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
              {new Date(checkedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="type-mono text-[11px] px-2 py-1 hover:opacity-60"
            style={{ border: "1px solid var(--color-rule)", color: "var(--color-muted)" }}
          >
            REFRESH
          </button>
        </div>
      </div>
      <ul
        className="grid gap-y-1.5"
        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: "1.75rem" }}
      >
        {rows.map((c) => (
          <li key={c.component} className="flex items-center gap-3 text-[13px]">
            <Dot status={c.status} />
            <span className="type-mono" style={{ color: "var(--color-ink)" }}>
              {c.component}
            </span>
            {c.detail ? (
              <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                {c.detail}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <style jsx>{`
        @keyframes wcn-hpulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
