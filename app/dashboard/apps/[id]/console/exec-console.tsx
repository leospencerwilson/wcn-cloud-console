"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconTerminal } from "@/components/ui/icons";
import LogStream, { type LogEvent } from "@/components/log-stream";

const HISTORY_KEY_PREFIX = "wcn:exec-history:";
const HISTORY_MAX = 20;

function loadHistory(appId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY_PREFIX + appId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveHistory(appId: string, history: string[]) {
  try {
    window.localStorage.setItem(
      HISTORY_KEY_PREFIX + appId,
      JSON.stringify(history.slice(0, HISTORY_MAX)),
    );
  } catch {
    // localStorage may be unavailable
  }
}

export default function ExecConsole({
  slug,
  appId,
}: {
  slug: string;
  appId: string;
}) {
  const [command, setCommand] = useState("");
  const [container, setContainer] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [source, setSource] = useState<{
    key: string;
    method: "POST";
    url: string;
    body: { command: string; container?: string };
  } | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHistory(loadHistory(appId));
  }, [appId]);

  function onRun(e?: React.FormEvent) {
    e?.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    const next = [cmd, ...history.filter((h) => h !== cmd)].slice(0, HISTORY_MAX);
    setHistory(next);
    saveHistory(appId, next);
    setHistoryIdx(null);
    setExitCode(null);
    setSource({
      key: `${appId}/${Date.now()}`,
      method: "POST",
      url: `/api/customers/${slug}/apps/${appId}/exec`,
      body: { command: cmd, container: container.trim() || undefined },
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      if (history.length === 0) return;
      e.preventDefault();
      const next = historyIdx === null ? 0 : Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setCommand(history[next]);
    } else if (e.key === "ArrowDown") {
      if (historyIdx === null) return;
      e.preventDefault();
      const next = historyIdx - 1;
      if (next < 0) {
        setHistoryIdx(null);
        setCommand("");
      } else {
        setHistoryIdx(next);
        setCommand(history[next]);
      }
    }
  }

  function onEvent(e: LogEvent) {
    if (e.type === "done") {
      const data = e.data as { exit_code?: number } | undefined;
      if (data && typeof data.exit_code === "number") setExitCode(data.exit_code);
    }
  }

  const source_ = useMemo(() => source, [source]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="type-eyebrow">§ ONE-OFF COMMAND</span>
            <span
              className="type-mono text-[11px]"
              style={{ color: "var(--color-muted)" }}
            >
              ↑/↓ for history · last {HISTORY_MAX}
            </span>
          </div>
          <form onSubmit={onRun} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={onKeyDown}
                className="flex-1 type-mono text-[13px] px-3 py-2"
                style={{
                  background: "var(--color-charcoal, #1a1a1a)",
                  color: "var(--color-ivory, #f4f1ea)",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 2,
                }}
                placeholder="$ ls -la /app"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn btn-primary" disabled={!command.trim()}>
                <IconTerminal />
                Run
              </button>
            </div>
            <label
              className="type-mono text-[11px] flex items-center gap-2"
              style={{ color: "var(--color-muted)" }}
            >
              container:
              <input
                value={container}
                onChange={(e) => setContainer(e.target.value)}
                className="type-mono text-[11px] px-2 py-1"
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: 2,
                  color: "var(--color-ink)",
                }}
                placeholder="(default)"
              />
            </label>
          </form>
        </div>
      </Card>

      <Card>
        <div
          className="px-6 py-3 flex items-center justify-between border-b"
          style={{ borderColor: "var(--color-hairline)" }}
        >
          <span className="type-eyebrow">§ OUTPUT</span>
          {exitCode !== null && (
            <span
              className="type-mono text-[11px]"
              style={{
                color: exitCode === 0 ? "var(--color-muted)" : "var(--color-danger, #b03020)",
              }}
            >
              exit {exitCode}
            </span>
          )}
        </div>
        <div className="px-2 py-2">
          <LogStream
            source={source_}
            height={420}
            onEvent={onEvent}
            emptyText="(no command run yet — type one above)"
          />
        </div>
      </Card>
    </div>
  );
}
