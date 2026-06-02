"use client";

import { useEffect, useState } from "react";
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
  const cls = tier.archived ? "pill pill-deleted" : "pill pill-tier";

  return (
    <span
      className={cls}
      title={tier.archived ? `Archived · ${summary}` : summary}
    >
      <TierGlyph />
      {tier.display_name}
    </span>
  );
}

function TierGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="14" width="5" height="7" rx="1" />
      <rect x="9.5" y="9" width="5" height="12" rx="1" />
      <rect x="16" y="4" width="5" height="17" rx="1" />
    </svg>
  );
}

export default TierBadge;
