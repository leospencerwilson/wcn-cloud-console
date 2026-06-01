"use client";

import { useEffect, useState } from "react";
import type { Tier } from "@/lib/db/tiers";

interface TierSelectProps {
  name?: string;
  defaultValue?: string;
  id?: string;
  required?: boolean;
}

export function TierSelect({
  name = "tier",
  defaultValue,
  id,
  required,
}: TierSelectProps) {
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [value, setValue] = useState<string>(defaultValue ?? "");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/tiers`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tiers: Tier[] } | null) => {
        if (cancelled || !data) return;
        setTiers(data.tiers);
        if (!defaultValue && data.tiers.length > 0) {
          setValue((prev) => prev || data.tiers[0]!.id);
        }
      })
      .catch(() => {
        if (!cancelled) setTiers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [defaultValue]);

  if (tiers === null) {
    return (
      <select id={id} name={name} className="field-select" disabled>
        <option>Loading tiers…</option>
      </select>
    );
  }

  if (tiers.length === 0) {
    return (
      <select id={id} name={name} className="field-select" disabled required={required}>
        <option value="">No tiers available</option>
      </select>
    );
  }

  return (
    <select
      id={id}
      name={name}
      className="field-select"
      required={required}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    >
      {tiers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.display_name} — £{t.price_gbp_monthly}/mo
        </option>
      ))}
    </select>
  );
}

export default TierSelect;
