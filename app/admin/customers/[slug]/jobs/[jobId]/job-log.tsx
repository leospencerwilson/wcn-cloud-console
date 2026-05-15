"use client";

import { useEffect, useRef, useState } from "react";

type Status = "connecting" | "queued" | "running" | "succeeded" | "failed" | "lost";

const statusLabel: Record<Status, string> = {
  connecting: "Connecting…",
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  lost: "Stream lost",
};

function statusColor(s: Status): string {
  if (s === "succeeded") return "var(--color-accent)";
  if (s === "failed" || s === "lost") return "#c0392b";
  if (s === "running") return "var(--color-ink)";
  return "var(--color-muted)";
}

interface JobLogProps {
  jobId: string;
}

export function JobLog({ jobId }: JobLogProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const paneRef = useRef<HTMLPreElement | null>(null);
  const autoScroll = useRef(true);

  useEffect(() => {
    const es = new EventSource(`/api/provision/${jobId}/stream`);

    es.addEventListener("meta", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as { status?: Status };
        if (parsed.status) setStatus(parsed.status);
      } catch {
        // ignore
      }
    });

    es.onmessage = (ev) => {
      setStatus((prev) => (prev === "connecting" || prev === "queued" ? "running" : prev));
      setLines((prev) => [...prev, ev.data]);
    };

    es.addEventListener("done", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          status?: Status;
          exitCode?: number | null;
        };
        if (parsed.status) setStatus(parsed.status);
        if (typeof parsed.exitCode === "number") setExitCode(parsed.exitCode);
      } catch {
        // ignore
      }
      es.close();
    });

    es.onerror = () => {
      setStatus((prev) => (prev === "succeeded" || prev === "failed" ? prev : "lost"));
    };

    return () => es.close();
  }, [jobId]);

  useEffect(() => {
    if (!autoScroll.current || !paneRef.current) return;
    paneRef.current.scrollTop = paneRef.current.scrollHeight;
  }, [lines]);

  function onScroll() {
    const el = paneRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    autoScroll.current = atBottom;
  }

  return (
    <div
      style={{
        background: "var(--color-paper)",
        border: "1px solid var(--color-rule)",
      }}
    >
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--color-rule)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-block w-2 h-2"
            style={{
              background: statusColor(status),
              animation: status === "running" ? "wcn-pulse 1.4s ease-in-out infinite" : "none",
            }}
          />
          <span
            className="type-eyebrow"
            style={{ color: statusColor(status), letterSpacing: "0.12em" }}
          >
            {statusLabel[status]}
            {exitCode !== null && status === "failed" ? ` · exit ${exitCode}` : ""}
          </span>
        </div>
        <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
          {lines.length} line{lines.length === 1 ? "" : "s"}
        </span>
      </div>

      <pre
        ref={paneRef}
        onScroll={onScroll}
        className="type-mono text-[12.5px] leading-[1.55] m-0"
        style={{
          background: "#0e1140",
          color: "#FAF7F2",
          padding: "20px 24px",
          maxHeight: "62vh",
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {lines.length === 0 && (
          <span style={{ color: "rgba(250,247,242,0.45)" }}>
            Waiting for output…
          </span>
        )}
        {lines.map((l, i) => (
          <div key={i}>{l || "\u00a0"}</div>
        ))}
      </pre>

      <style jsx>{`
        @keyframes wcn-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
