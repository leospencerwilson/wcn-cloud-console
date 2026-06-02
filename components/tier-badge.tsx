"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Tier } from "@/lib/db/tiers";

const cache = new Map<string, Tier | null>();
const inflight = new Map<string, Promise<Tier | null>>();

async function fetchTier(id: string): Promise<Tier | null> {
  if (cache.has(id)) return cache.get(id) ?? null;
  const existing = inflight.get(id);
  if (existing) return existing;
  const p = (async () => {
    try {
      const res = await fetch(`/api/admin/tiers/${encodeURIComponent(id)}`, {
        cache: "force-cache",
      });
      if (!res.ok) {
        cache.set(id, null);
        return null;
      }
      const data = (await res.json()) as { tier: Tier };
      cache.set(id, data.tier);
      return data.tier;
    } catch {
      cache.set(id, null);
      return null;
    } finally {
      inflight.delete(id);
    }
  })();
  inflight.set(id, p);
  return p;
}

function fmtRam(mb: number): string {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

// Tiers are user-defined (pulled from the tiers table), so we can't hardcode a
// look per tier. Instead each tier id maps deterministically to one of these
// {hue, icon} pairs — a stable, distinct colour + glyph for every tier.
const svgProps = {
  width: 11,
  height: 11,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
} as const;

const TIER_VISUALS: { hue: number; icon: (c: string) => ReactNode }[] = [
  {
    hue: 245, // blue — layered stack
    icon: (c) => (
      <svg {...svgProps} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round">
        <path d="M12 3l9 5-9 5-9-5 9-5z" />
        <path d="M3 13l9 5 9-5" />
      </svg>
    ),
  },
  {
    hue: 150, // green — bolt
    icon: (c) => (
      <svg {...svgProps} fill={c}>
        <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
    ),
  },
  {
    hue: 75, // amber — ascending bars
    icon: (c) => (
      <svg {...svgProps} fill={c}>
        <rect x="3" y="14" width="5" height="7" rx="1" />
        <rect x="9.5" y="9" width="5" height="12" rx="1" />
        <rect x="16" y="4" width="5" height="17" rx="1" />
      </svg>
    ),
  },
  {
    hue: 305, // violet — hexagon
    icon: (c) => (
      <svg {...svgProps} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round">
        <path d="M12 2.5l8.5 5v9L12 21.5 3.5 16.5v-9L12 2.5z" />
      </svg>
    ),
  },
  {
    hue: 25, // orange — shield
    icon: (c) => (
      <svg {...svgProps} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round">
        <path d="M12 2.5l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11v-6l8-3z" />
      </svg>
    ),
  },
  {
    hue: 195, // cyan — orbit
    icon: (c) => (
      <svg {...svgProps} fill="none" stroke={c} strokeWidth={2}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="2.4" fill={c} stroke="none" />
      </svg>
    ),
  },
  {
    hue: 340, // pink — diamond
    icon: (c) => (
      <svg {...svgProps} fill={c}>
        <path d="M12 2l9 10-9 10-9-10 9-10z" />
      </svg>
    ),
  },
  {
    hue: 110, // lime — 4-point star
    icon: (c) => (
      <svg {...svgProps} fill={c}>
        <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2L12 2z" />
      </svg>
    ),
  },
];

function tierVisual(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const { hue, icon } = TIER_VISUALS[h % TIER_VISUALS.length];
  // Mid lightness/chroma so the colour reads on both light and dark surfaces.
  return { color: `oklch(0.72 0.16 ${hue})`, icon };
}

export function TierBadge({ tierId }: { tierId: string }) {
  const [tier, setTier] = useState<Tier | null | undefined>(
    cache.has(tierId) ? cache.get(tierId) : undefined,
  );

  useEffect(() => {
    let cancelled = false;
    if (cache.has(tierId)) {
      setTier(cache.get(tierId) ?? null);
      return;
    }
    fetchTier(tierId).then((t) => {
      if (!cancelled) setTier(t);
    });
    return () => {
      cancelled = true;
    };
  }, [tierId]);

  if (tier === undefined) {
    return (
      <span className="pill pill-used type-mono" title="loading…">
        {tierId}
      </span>
    );
  }

  if (tier === null) {
    return (
      <span className="pill pill-used type-mono" title="Unknown tier">
        {tierId}
      </span>
    );
  }

  const summary = `${tier.vcpu} vCPU · ${fmtRam(tier.ram_mb)} · ${tier.disk_gb} GB disk · £${tier.price_gbp_monthly}/mo`;
  const v = tierVisual(tierId);

  if (tier.archived) {
    return (
      <span className="pill pill-deleted" title={`Archived · ${summary}`}>
        <span style={{ display: "inline-flex", color: "var(--text-4)" }}>
          {v.icon("var(--text-4)")}
        </span>
        {tier.display_name}
      </span>
    );
  }

  return (
    <span
      className="pill pill-tier"
      title={summary}
      style={{
        borderColor: `color-mix(in oklch, ${v.color} 40%, var(--line))`,
        background: `color-mix(in oklch, ${v.color} 13%, var(--surface))`,
      }}
    >
      <span style={{ display: "inline-flex", color: v.color }}>
        {v.icon(v.color)}
      </span>
      {tier.display_name}
    </span>
  );
}

export default TierBadge;
