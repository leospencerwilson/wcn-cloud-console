"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconX } from "@/components/ui/icons";

type Line = { kind: "out" | "in" | "ok" | "err" | "dim"; text: string };

const HELP = [
  "wcn — local console shell (read-only)",
  "",
  "  help            show this message",
  "  whoami          show current session",
  "  go <route>      navigate the console (e.g. go admin/capacity)",
  "  clear           clear the buffer",
  "  echo <text>     echo text",
  "",
  "Toggle with backtick (`)  ·  Close with esc",
];

export default function TerminalDrawer() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { kind: "dim", text: "WCN console shell · type 'help'" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "`" && !inField) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  const push = useCallback((l: Line | Line[]) => {
    setLines((cur) => [...cur, ...(Array.isArray(l) ? l : [l])]);
  }, []);

  const run = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      push({ kind: "in", text: `> ${cmd}` });
      if (!cmd) return;
      setHistory((h) => [...h, cmd]);
      setHistIdx(null);
      const [head, ...rest] = cmd.split(/\s+/);
      const arg = rest.join(" ");
      switch (head) {
        case "help":
          push(HELP.map((t) => ({ kind: "dim", text: t }) as Line));
          break;
        case "clear":
          setLines([]);
          break;
        case "whoami":
          fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => push({ kind: "ok", text: JSON.stringify(d) }))
            .catch((e) =>
              push({ kind: "err", text: e instanceof Error ? e.message : String(e) }),
            );
          break;
        case "echo":
          push({ kind: "out", text: arg });
          break;
        case "go": {
          const path = arg.startsWith("/") ? arg : `/${arg}`;
          push({ kind: "ok", text: `→ ${path}` });
          window.location.assign(path);
          break;
        }
        default:
          push({ kind: "err", text: `unknown command: ${head}` });
      }
    },
    [push],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      run(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = histIdx == null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(history[next] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx == null) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(null);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(history[next] || "");
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        left: "var(--sidebar-w)",
        right: 0,
        bottom: 0,
        height: 320,
        background: "oklch(0.12 0.005 80)",
        borderTop: "1px solid var(--line-2)",
        zIndex: 90,
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform .25s cubic-bezier(.2,.9,.3,1)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-mono)",
        boxShadow: "0 -20px 40px -10px oklch(0 0 0 / 0.4)",
      }}
    >
      <div
        className="flex items-center"
        style={{
          height: 32,
          padding: "0 16px",
          gap: 12,
          borderBottom: "1px solid var(--line)",
          fontSize: 11.5,
        }}
      >
        <span style={{ color: "var(--brand)" }}>●</span>
        <span style={{ color: "var(--text-2)" }}>wcn:console</span>
        <span style={{ color: "var(--text-4)", marginLeft: "auto" }}>
          <span className="kbd">`</span> toggle · <span className="kbd">esc</span> close
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen(false)}
          style={{ height: 22, padding: "0 6px" }}
        >
          <IconX />
        </button>
      </div>
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 16px",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--text-2)",
        }}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              color:
                l.kind === "ok"
                  ? "oklch(0.8 0.14 155)"
                  : l.kind === "err"
                    ? "oklch(0.82 0.18 25)"
                    : l.kind === "in"
                      ? "var(--brand)"
                      : l.kind === "dim"
                        ? "var(--text-4)"
                        : "var(--text-2)",
              whiteSpace: "pre-wrap",
            }}
          >
            {l.text}
          </div>
        ))}
        <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
          <span style={{ color: "var(--brand)" }}>›</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            style={{
              background: "transparent",
              border: 0,
              outline: 0,
              color: "var(--text)",
              flex: 1,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
