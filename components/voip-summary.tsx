"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type Summary = {
  active_calls: number | null;
  registrations: number | null;
  companies: number | null;
};

const CARDS: { key: keyof Summary; label: string }[] = [
  { key: "active_calls", label: "Active calls" },
  { key: "registrations", label: "Registered phones" },
  { key: "companies", label: "Companies" },
];

export default function VoipSummary() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/admin/voice/summary", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive) setData(d as Summary | null);
        })
        .catch(() => {});
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {CARDS.map((c) => (
        <Card key={c.key} className="px-8 py-7">
          <p className="type-meta" style={{ marginBottom: 10 }}>
            {c.label}
          </p>
          <p className="type-h2" style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
            {data ? data[c.key] ?? "—" : "—"}
          </p>
        </Card>
      ))}
    </div>
  );
}
