"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PublicOverallStatus,
  PublicServiceStatus,
  PublicStatus,
} from "@/lib/provisioner/types";

const OVERALL_LABEL: Record<PublicOverallStatus, string> = {
  operational: "All systems operational",
  degraded: "Partial outage",
  down: "Major outage",
};

const OVERALL_GLYPH: Record<PublicOverallStatus, string> = {
  operational: "●",
  degraded: "▲",
  down: "×",
};

const SERVICE_LABEL: Record<PublicServiceStatus, string> = {
  operational: "operational",
  degraded: "degraded",
  stopped: "stopped",
  down: "down",
  unknown: "unknown",
};

const SERVICE_GLYPH: Record<PublicServiceStatus, string> = {
  operational: "●",
  degraded: "▲",
  stopped: "■",
  down: "×",
  unknown: "?",
};

function overallColor(s: PublicOverallStatus): string {
  if (s === "operational") return "var(--color-success, #2f6b3a)";
  if (s === "degraded") return "var(--color-warning, #b07a1f)";
  return "var(--color-danger, #b03020)";
}

function serviceColor(s: PublicServiceStatus): string {
  if (s === "operational") return "var(--color-success, #2f6b3a)";
  if (s === "degraded") return "var(--color-warning, #b07a1f)";
  if (s === "down") return "var(--color-danger, #b03020)";
  if (s === "stopped") return "var(--color-muted)";
  return "var(--color-muted)";
}

function formatPct(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(v >= 99.95 ? 2 : 1)}%`;
}

function formatChecked(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

export default function StatusView({ initial }: { initial: PublicStatus }) {
  const router = useRouter();
  const [data, setData] = useState<PublicStatus>(initial);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-ivory)", color: "var(--color-charcoal)" }}
    >
      <div
        aria-hidden
        style={{ height: 2, width: "100%", background: "var(--color-navy)" }}
      />
      <header
        className="border-b-hairline border-b"
        style={{
          background: "var(--color-ivory)",
          borderColor: "var(--color-hairline)",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center">
          <span
            className="font-display italic font-semibold text-[18px] tracking-[-0.02em]"
            style={{ color: "var(--color-navy)" }}
          >
            WCN
          </span>
          <span
            aria-hidden
            className="mx-4 h-5 w-px"
            style={{ background: "var(--color-hairline)" }}
          />
          <span className="type-eyebrow">§ STATUS</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 space-y-14">
        <div>
          <p className="type-eyebrow mb-3">§ STATUS PAGE</p>
          <h1 className="type-h1">{data.customer.name}</h1>
        </div>

        <section
          className="px-8 py-10 text-center"
          style={{
            border: "1px solid var(--color-hairline)",
            background: "white",
            borderRadius: 2,
          }}
        >
          <div
            className="text-[40px] leading-none mb-4"
            style={{ color: overallColor(data.overall) }}
            aria-hidden
          >
            {OVERALL_GLYPH[data.overall]}
          </div>
          <p
            className="font-display text-[28px] tracking-[-0.01em]"
            style={{ color: overallColor(data.overall) }}
          >
            {OVERALL_LABEL[data.overall]}
          </p>
        </section>

        <section>
          <h2 className="type-eyebrow mb-5">§ SERVICES</h2>
          <ul
            style={{
              border: "1px solid var(--color-hairline)",
              borderRadius: 2,
              background: "white",
            }}
          >
            {data.services.length === 0 && (
              <li
                className="px-6 py-5 type-mono text-[12px]"
                style={{ color: "var(--color-muted)" }}
              >
                No services reported.
              </li>
            )}
            {data.services.map((svc, i) => (
              <li
                key={`${svc.name}-${i}`}
                className="px-6 py-4 flex items-center justify-between"
                style={{
                  borderTop:
                    i === 0 ? "none" : "1px solid var(--color-hairline)",
                }}
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="text-[14px]"
                    style={{ color: serviceColor(svc.status) }}
                  >
                    {SERVICE_GLYPH[svc.status]}
                  </span>
                  <span className="text-[15px]">{svc.name}</span>
                </span>
                <span
                  className="type-mono text-[12px]"
                  style={{ color: serviceColor(svc.status) }}
                >
                  {SERVICE_LABEL[svc.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="type-eyebrow mb-5">§ UPTIME</h2>
          <div
            className="grid grid-cols-3 gap-px"
            style={{
              border: "1px solid var(--color-hairline)",
              background: "var(--color-hairline)",
              borderRadius: 2,
            }}
          >
            {[
              { label: "24h", v: data.uptime.h24 },
              { label: "30d", v: data.uptime.d30 },
              { label: "90d", v: data.uptime.d90 },
            ].map((u) => (
              <div
                key={u.label}
                className="px-6 py-6 text-center"
                style={{ background: "white" }}
              >
                <p className="type-eyebrow mb-3">§ {u.label}</p>
                <p
                  className="font-display text-[28px] tabular-nums"
                  style={{ color: "var(--color-navy)" }}
                >
                  {formatPct(u.v)}
                </p>
                {u.v == null && (
                  <p className="type-meta mt-1">Not enough data yet</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="type-eyebrow mb-5">§ RECENT INCIDENTS</h2>
          {data.incidents.length === 0 ? (
            <p
              className="px-6 py-6 type-mono text-[13px]"
              style={{
                color: "var(--color-muted)",
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
                background: "white",
              }}
            >
              No incidents in the last 90 days.
            </p>
          ) : (
            <ul
              style={{
                border: "1px solid var(--color-hairline)",
                borderRadius: 2,
                background: "white",
              }}
            >
              {data.incidents.map((inc, i) => (
                <li
                  key={inc.id}
                  className="px-6 py-4"
                  style={{
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--color-hairline)",
                  }}
                >
                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                    <span className="text-[14px] font-medium">
                      {inc.summary}
                    </span>
                    <span
                      className="type-mono text-[11px]"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <p
                    className="type-mono text-[11px] mt-1"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {new Date(inc.started_at).toLocaleString()}
                    {inc.resolved_at
                      ? ` — resolved ${new Date(inc.resolved_at).toLocaleString()}`
                      : " — ongoing"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer
          className="pt-8 text-center type-mono text-[11px]"
          style={{ color: "var(--color-muted)" }}
        >
          Status last checked {formatChecked(data.checked_at)} · auto-refresh
          every 60s
        </footer>
      </main>
    </div>
  );
}
