"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

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
  if (s === "failed") return "#c0392b";
  if (s === "lost") return "#d4a017";
  if (s === "running") return "var(--color-ink)";
  return "var(--color-muted)";
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;

type PhaseState = "pending" | "running" | "done" | "failed";

interface Phase {
  key: string;
  label: string;
  match: RegExp;
}

const PHASES: Phase[] = [
  { key: "vm-create", label: "vm-create", match: /\[(?:1|2|5)\/10\]|vm-create|Cloning template|Allocating VMID/i },
  { key: "cloud-init", label: "cloud-init", match: /\[(?:6|7)\/10\]|cloud-init|Configuring VM/i },
  { key: "dns", label: "dns", match: /\[4\/10\]|\bDNS\b/i },
  { key: "tunnel", label: "tunnel", match: /\[(?:3|8)\/10\]|Cloudflare Tunnel|tunnel cred/i },
  { key: "coolify-install", label: "coolify-install", match: /\[10\/10\]|Coolify service account|coolify-install/i },
  { key: "supabase-up", label: "supabase-up", match: /\[9\/10\]|Health check|supabase/i },
];

function detectPhase(line: string): string | null {
  for (const p of PHASES) {
    if (p.match.test(line)) return p.key;
  }
  const marker = /(?:^|\s)(?:==>|===)\s*([a-z0-9-]+)|\[phase:([a-z0-9-]+)\]/i.exec(line);
  if (marker) {
    const k = (marker[1] || marker[2] || "").toLowerCase();
    if (PHASES.find((p) => p.key === k)) return k;
  }
  return null;
}

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

interface JobLogProps {
  jobId: string;
}

export function JobLog({ jobId }: JobLogProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [phaseStates, setPhaseStates] = useState<Record<string, PhaseState>>(() =>
    Object.fromEntries(PHASES.map((p) => [p.key, "pending" as PhaseState])),
  );
  const [search, setSearch] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [copied, setCopied] = useState(false);

  const paneRef = useRef<HTMLPreElement | null>(null);
  const autoScroll = useRef(true);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [matchCursor, setMatchCursor] = useState(0);

  function pushLine(raw: string) {
    const cleaned = raw.replace(ANSI_RE, "");
    setLines((prev) => [...prev, cleaned]);
    setStartedAt((prev) => prev ?? Date.now());

    const phaseKey = detectPhase(cleaned);
    if (phaseKey) {
      setCurrentPhase(phaseKey);
      setPhaseStates((prev) => {
        const next = { ...prev };
        let seen = false;
        for (const p of PHASES) {
          if (p.key === phaseKey) {
            next[p.key] = "running";
            seen = true;
          } else if (!seen) {
            if (next[p.key] === "pending" || next[p.key] === "running") {
              next[p.key] = "done";
            }
          }
        }
        return next;
      });
    }
  }

  function openStream(isReconnect: boolean) {
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
    }

    if (isReconnect) {
      setLines((prev) => [...prev, "[reconnecting…]"]);
    }

    const es = new EventSource(`/api/provision/${jobId}/stream`);
    esRef.current = es;

    es.addEventListener("meta", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as { status?: Status };
        if (parsed.status) setStatus(parsed.status);
      } catch {}
    });

    es.onmessage = (ev) => {
      setStatus((prev) => (prev === "connecting" || prev === "queued" || prev === "lost" ? "running" : prev));
      attemptsRef.current = 0;
      setAttempts(0);
      pushLine(ev.data);
    };

    es.addEventListener("done", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data) as {
          status?: Status;
          exitCode?: number | null;
        };
        if (parsed.status) {
          setStatus(parsed.status);
          setPhaseStates((prev) => {
            const next = { ...prev };
            if (currentPhase) {
              next[currentPhase] = parsed.status === "failed" ? "failed" : "done";
            } else {
              for (const p of PHASES) {
                if (next[p.key] === "running") {
                  next[p.key] = parsed.status === "failed" ? "failed" : "done";
                }
              }
            }
            return next;
          });
        }
        if (typeof parsed.exitCode === "number") setExitCode(parsed.exitCode);
      } catch {}
      es.close();
      esRef.current = null;
    });

    es.onerror = () => {
      setStatus((prev) => (prev === "succeeded" || prev === "failed" ? prev : "lost"));
      try {
        es.close();
      } catch {}
      esRef.current = null;

      const next = attemptsRef.current + 1;
      attemptsRef.current = next;
      setAttempts(next);
      if (next > 4) {
        setGaveUp(true);
        return;
      }
      const delay = Math.pow(2, next - 1) * 1000;
      reconnectTimer.current = setTimeout(() => openStream(true), delay);
    };
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`/api/provision/${jobId}/log`, { cache: "no-store" });
        if (r.ok) {
          const text = await r.text();
          if (!cancelled && text) {
            const parts = text.replace(ANSI_RE, "").split(/\r?\n/);
            if (parts.length && parts[parts.length - 1] === "") parts.pop();
            setLines(parts);
            setStartedAt(Date.now() - 1000);
            let phase: string | null = null;
            for (const ln of parts) {
              const p = detectPhase(ln);
              if (p) phase = p;
            }
            if (phase) {
              setCurrentPhase(phase);
              setPhaseStates((prev) => {
                const next = { ...prev };
                let seen = false;
                for (const p of PHASES) {
                  if (p.key === phase) {
                    next[p.key] = "running";
                    seen = true;
                  } else if (!seen) {
                    next[p.key] = "done";
                  }
                }
                return next;
              });
            }
          }
        }
      } catch {
        // resume gracefully skipped
      }

      if (!cancelled) openStream(false);
    })();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
        esRef.current = null;
      }
    };
  }, [jobId]);

  useEffect(() => {
    if (status !== "running" && status !== "queued" && status !== "connecting") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (!autoScroll.current || !paneRef.current) return;
    paneRef.current.scrollTop = paneRef.current.scrollHeight;
  }, [lines]);

  function onScroll() {
    const el = paneRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    autoScroll.current = isBottom;
    setAtBottom(isBottom);
  }

  function jumpToLatest() {
    const el = paneRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    autoScroll.current = true;
    setAtBottom(true);
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  function downloadAll() {
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-${jobId}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onCancel() {
    if (!window.confirm("Cancel this provisioning job? The orchestrator will be sent SIGTERM.")) return;
    try {
      await fetch(`/api/provision/${jobId}/cancel`, { method: "POST" });
    } catch {}
  }

  async function onRetry() {
    try {
      const r = await fetch(`/api/provision/${jobId}/retry`, { method: "POST" });
      if (!r.ok) window.alert(`Retry failed: ${r.status}`);
    } catch (e) {
      window.alert(`Retry failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function manualRetryStream() {
    attemptsRef.current = 0;
    setAttempts(0);
    setGaveUp(false);
    openStream(true);
  }

  const matchIndices = useMemo(() => {
    if (!search) return [] as number[];
    const q = search.toLowerCase();
    const out: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) out.push(i);
    }
    return out;
  }, [search, lines]);

  useEffect(() => {
    if (matchIndices.length === 0) {
      setMatchCursor(0);
      return;
    }
    if (matchCursor >= matchIndices.length) setMatchCursor(0);
  }, [matchIndices, matchCursor]);

  function gotoMatch(delta: number) {
    if (matchIndices.length === 0) return;
    const next = (matchCursor + delta + matchIndices.length) % matchIndices.length;
    setMatchCursor(next);
    const lineIdx = matchIndices[next];
    const el = lineRefs.current[lineIdx];
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    autoScroll.current = false;
  }

  const lastNonEmpty = useMemo(() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i] && lines[i].trim()) return lines[i];
    }
    return "";
  }, [lines]);

  const elapsedMs = startedAt ? now - startedAt : 0;
  const isCancellable = status === "running" || status === "queued";
  const currentPhaseLabel = currentPhase
    ? PHASES.find((p) => p.key === currentPhase)?.label || currentPhase
    : "—";

  function renderLine(line: string, idx: number) {
    const visible = !search || line.toLowerCase().includes(search.toLowerCase());
    const isActiveMatch = matchIndices[matchCursor] === idx;
    const content = !search
      ? line || "\u00a0"
      : highlight(line, search, isActiveMatch);
    return (
      <div
        key={idx}
        ref={(el) => {
          lineRefs.current[idx] = el;
        }}
        style={{
          opacity: visible ? 1 : 0.18,
          background: isActiveMatch ? "rgba(255,255,160,0.08)" : "transparent",
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="grid gap-x-8 gap-y-2 px-6 py-4"
        style={{
          background: "var(--color-paper)",
          border: "1px solid var(--color-rule)",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        <HeaderCell label="Started" value={startedAt ? new Date(startedAt).toLocaleTimeString() : "—"} />
        <HeaderCell label="Elapsed" value={startedAt ? formatElapsed(elapsedMs) : "—"} />
        <HeaderCell label="Phase" value={currentPhaseLabel} />
      </div>

      <div
        className="px-6 py-4"
        style={{ background: "var(--color-paper)", border: "1px solid var(--color-rule)" }}
      >
        <p className="type-eyebrow mb-3" style={{ color: "var(--color-muted)" }}>
          Phases
        </p>
        <ul className="space-y-1.5">
          {PHASES.map((p) => {
            const st = phaseStates[p.key];
            return (
              <li key={p.key} className="flex items-center gap-3 text-[13px]">
                <span
                  className="inline-block w-4 text-center type-mono"
                  style={{
                    color:
                      st === "done"
                        ? "var(--color-accent)"
                        : st === "failed"
                          ? "#c0392b"
                          : st === "running"
                            ? "var(--color-ink)"
                            : "var(--color-muted)",
                    animation: st === "running" ? "wcn-pulse 1.4s ease-in-out infinite" : "none",
                  }}
                >
                  {st === "done" ? "✓" : st === "failed" ? "×" : st === "running" ? "●" : "·"}
                </span>
                <span
                  className="type-mono"
                  style={{
                    color: st === "pending" ? "var(--color-muted)" : "var(--color-ink)",
                  }}
                >
                  {p.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {status === "failed" && (
        <div
          className="px-6 py-4 space-y-3"
          style={{ background: "#fdf3f1", border: "1px solid #c0392b" }}
        >
          <p className="type-eyebrow" style={{ color: "#c0392b" }}>
            § PROVISION FAILED
          </p>
          <div className="text-[13px] space-y-1" style={{ color: "var(--color-ink)" }}>
            <div>
              <span style={{ color: "var(--color-muted)" }}>Phase:</span>{" "}
              <span className="type-mono">{currentPhaseLabel}</span>
            </div>
            <div>
              <span style={{ color: "var(--color-muted)" }}>Exit code:</span>{" "}
              <span className="type-mono">{exitCode === null ? "—" : exitCode}</span>
            </div>
            <div className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
              {lastNonEmpty || "(no output)"}
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/runbooks/provisioning-failure"
              className="type-eyebrow px-3 py-1.5 hover:opacity-60 transition-opacity"
              style={{ border: "1px solid #c0392b", color: "#c0392b" }}
            >
              Open runbook
            </Link>
            <button
              type="button"
              onClick={onRetry}
              className="type-eyebrow px-3 py-1.5 hover:opacity-60 transition-opacity"
              style={{ border: "1px solid var(--color-ink)", color: "var(--color-ink)" }}
            >
              Retry job
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--color-paper)",
          border: "1px solid var(--color-rule)",
          position: "relative",
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap"
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
            {isCancellable && (
              <button
                type="button"
                onClick={onCancel}
                className="type-eyebrow px-2 py-1 hover:opacity-60 transition-opacity"
                style={{ border: "1px solid #c0392b", color: "#c0392b", letterSpacing: "0.1em" }}
              >
                Cancel
              </button>
            )}
            {gaveUp && status === "lost" && (
              <button
                type="button"
                onClick={manualRetryStream}
                className="type-eyebrow px-2 py-1 hover:opacity-60 transition-opacity"
                style={{
                  border: "1px solid var(--color-ink)",
                  color: "var(--color-ink)",
                  letterSpacing: "0.1em",
                }}
              >
                Retry
              </button>
            )}
            {attempts > 0 && !gaveUp && status === "lost" && (
              <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                reconnect {attempts}/4
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="type-mono text-[11px] px-2 py-1"
                style={{
                  border: "1px solid var(--color-rule)",
                  background: "var(--color-paper)",
                  color: "var(--color-ink)",
                  width: "140px",
                }}
              />
              {search && (
                <>
                  <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {matchIndices.length === 0
                      ? "0 matches"
                      : `${matchCursor + 1}/${matchIndices.length}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => gotoMatch(-1)}
                    className="type-mono text-[11px] px-1.5 py-0.5 hover:opacity-60"
                    style={{ border: "1px solid var(--color-rule)" }}
                    aria-label="Previous match"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => gotoMatch(1)}
                    className="type-mono text-[11px] px-1.5 py-0.5 hover:opacity-60"
                    style={{ border: "1px solid var(--color-rule)" }}
                    aria-label="Next match"
                  >
                    ↓
                  </button>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={copyAll}
              className="type-mono text-[11px] px-2 py-1 hover:opacity-60"
              style={{ border: "1px solid var(--color-rule)", color: "var(--color-muted)" }}
            >
              {copied ? "COPIED" : "COPY"}
            </button>
            <button
              type="button"
              onClick={downloadAll}
              className="type-mono text-[11px] px-2 py-1 hover:opacity-60"
              style={{ border: "1px solid var(--color-rule)", color: "var(--color-muted)" }}
            >
              DOWNLOAD
            </button>
            <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </span>
          </div>
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
            <span style={{ color: "rgba(250,247,242,0.45)" }}>Waiting for output…</span>
          )}
          {lines.map((l, i) => renderLine(l, i))}
        </pre>

        {!atBottom && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="type-eyebrow px-3 py-1.5 hover:opacity-80"
            style={{
              position: "absolute",
              bottom: "16px",
              right: "20px",
              background: "var(--color-ink)",
              color: "var(--color-paper)",
              letterSpacing: "0.12em",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            ↓ Jump to latest
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes wcn-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        :global(mark.wcn-match) {
          background: rgba(255, 235, 90, 0.45);
          color: inherit;
          padding: 0 1px;
        }
        :global(mark.wcn-match-active) {
          background: rgba(255, 200, 0, 0.85);
          color: #0e1140;
          padding: 0 1px;
        }
      `}</style>
    </div>
  );
}

function HeaderCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="type-eyebrow" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      <p className="type-mono text-[14px]" style={{ color: "var(--color-ink)" }}>
        {value}
      </p>
    </div>
  );
}

function highlight(line: string, query: string, active: boolean) {
  if (!query) return line || "\u00a0";
  const q = query.toLowerCase();
  const lower = line.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < line.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parts.push(line.slice(i));
      break;
    }
    if (idx > i) parts.push(line.slice(i, idx));
    parts.push(
      <mark key={key++} className={active ? "wcn-match-active" : "wcn-match"}>
        {line.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return parts.length === 0 ? line || "\u00a0" : parts;
}
