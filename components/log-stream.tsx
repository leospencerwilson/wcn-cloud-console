"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LogEvent =
  | { type: "log"; line: string }
  | { type: "stdout"; line: string }
  | { type: "stderr"; line: string }
  | { type: "meta"; data: unknown }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string };

export type LogStreamProps = {
  // Streaming source. `key` changes restart the stream.
  source: {
    key: string;
    method: "GET" | "POST";
    url: string;
    body?: unknown;
  } | null;
  height?: number;
  showControls?: boolean;
  onEvent?: (e: LogEvent) => void;
  emptyText?: string;
};

// Parse a single SSE event block ("event: foo\ndata: bar\n…") into a LogEvent.
function parseBlock(block: string): LogEvent | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const raw of block.split("\n")) {
    if (raw.startsWith(":")) continue; // comment / keepalive
    if (raw.startsWith("event:")) event = raw.slice(6).trim();
    else if (raw.startsWith("data:")) dataLines.push(raw.slice(5).replace(/^ /, ""));
  }
  const data = dataLines.join("\n");
  if (event === "log") return { type: "log", line: data };
  if (event === "stdout") return { type: "stdout", line: data };
  if (event === "stderr") return { type: "stderr", line: data };
  if (event === "meta") {
    try {
      return { type: "meta", data: JSON.parse(data) };
    } catch {
      return { type: "meta", data };
    }
  }
  if (event === "done") {
    try {
      return { type: "done", data: JSON.parse(data) };
    } catch {
      return { type: "done", data };
    }
  }
  if (event === "error") return { type: "error", message: data };
  return null;
}

type Line = { kind: "log" | "stdout" | "stderr" | "system"; text: string };

// Upstream provisioner errors sometimes arrive as JSON-in-JSON
// (e.g. {"error":"{\"error\":\"Server Error\",\"code\":\"coolify_error\"}","code":"upstream_error"}).
// Unwrap repeatedly and surface the deepest human-readable message.
function prettifyError(raw: string): string {
  let cur: unknown = raw;
  for (let i = 0; i < 5; i++) {
    if (typeof cur !== "string") break;
    const trimmed = cur.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) break;
    try {
      cur = JSON.parse(trimmed);
    } catch {
      break;
    }
  }
  const seen = new Set<unknown>();
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const obj = cur as Record<string, unknown>;
    const next = obj.error ?? obj.message ?? obj.detail;
    if (next === undefined) break;
    if (typeof next === "string") {
      const t = next.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try { cur = JSON.parse(t); continue; } catch { cur = next; break; }
      }
      cur = next;
      break;
    }
    cur = next;
  }
  if (typeof cur === "string") return cur;
  try { return JSON.stringify(cur); } catch { return String(cur); }
}

export default function LogStream({
  source,
  height = 420,
  showControls = true,
  onEvent,
  emptyText = "(no output yet)",
}: LogStreamProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "done" | "error">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const paneRef = useRef<HTMLPreElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const appendLine = useCallback((line: Line) => {
    setLines((ls) => {
      const next = ls.length > 5000 ? ls.slice(-4500) : ls;
      return [...next, line];
    });
  }, []);

  useEffect(() => {
    if (!source) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLines([]);
    setErrMsg(null);
    setStatus("connecting");

    (async () => {
      try {
        const res = await fetch(source.url, {
          method: source.method,
          headers: source.body
            ? { "content-type": "application/json" }
            : undefined,
          body: source.body ? JSON.stringify(source.body) : undefined,
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          setErrMsg(text ? prettifyError(text) : `HTTP ${res.status}`);
          setStatus("error");
          return;
        }
        setStatus("streaming");
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE events are separated by a blank line.
          let idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const ev = parseBlock(block);
            if (!ev) continue;
            onEvent?.(ev);
            if (ev.type === "log") appendLine({ kind: "log", text: ev.line });
            else if (ev.type === "stdout") appendLine({ kind: "stdout", text: ev.line });
            else if (ev.type === "stderr") appendLine({ kind: "stderr", text: ev.line });
            else if (ev.type === "done") {
              setStatus("done");
              ctrl.abort();
            } else if (ev.type === "error") {
              setErrMsg(ev.message ? prettifyError(ev.message) : "Stream error");
              setStatus("error");
              ctrl.abort();
            }
          }
        }
        setStatus((s) => (s === "streaming" ? "done" : s));
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setErrMsg(err instanceof Error ? err.message : "Network error");
        setStatus("error");
      }
    })();

    return () => ctrl.abort();
  }, [source, appendLine, onEvent]);

  // Auto-scroll to bottom when new lines arrive (unless user has scrolled up).
  useEffect(() => {
    if (!autoScroll) return;
    const el = paneRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, autoScroll]);

  function stop() {
    abortRef.current?.abort();
    setStatus("done");
  }

  return (
    <div className="space-y-3">
      {showControls && (
        <div className="flex items-center justify-between">
          <span
            className="type-mono text-[11px]"
            style={{ color: "var(--color-muted)" }}
          >
            {status === "idle" && "Idle"}
            {status === "connecting" && "Connecting…"}
            {status === "streaming" && "● Streaming"}
            {status === "done" && "✓ Done"}
            {status === "error" && `⚠ ${errMsg ?? "Error"}`}
            {" · "}
            {lines.length} lines
          </span>
          <div className="flex items-center gap-2">
            <label
              className="type-mono text-[11px] flex items-center gap-1"
              style={{ color: "var(--color-muted)" }}
            >
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              autoscroll
            </label>
            {status === "streaming" && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={stop}>
                Stop
              </button>
            )}
          </div>
        </div>
      )}
      <pre
        ref={paneRef}
        className="type-mono text-[12px] overflow-auto px-4 py-3 whitespace-pre-wrap"
        style={{
          background: "var(--color-charcoal, #1a1a1a)",
          color: "var(--color-ivory, #f4f1ea)",
          maxHeight: height,
          minHeight: height,
          borderRadius: 2,
        }}
      >
        {lines.length === 0 ? (
          <span style={{ opacity: 0.5 }}>{emptyText}</span>
        ) : (
          lines.map((l, i) => (
            <div
              key={i}
              style={{
                color:
                  l.kind === "stderr"
                    ? "#ff8a80"
                    : l.kind === "system"
                    ? "#888"
                    : undefined,
              }}
            >
              {l.text}
            </div>
          ))
        )}
      </pre>
    </div>
  );
}
