"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SECTIONS,
  type Endpoint,
  type Method,
  type Section,
} from "./spec";

type Lang = "curl" | "js";

const METHOD_TONE: Record<Method, string> = {
  GET: "var(--ok)",
  POST: "var(--brand)",
  PUT: "var(--brand)",
  PATCH: "var(--accent)",
  DELETE: "var(--crit)",
};

// Build a single markdown blob covering the whole API surface. Designed to
// paste straight into an AI coding assistant (Claude / Cursor / etc.) as
// context for an agent that needs to drive the WCN Cloud Customer API.
function buildAiSpec(): string {
  const lines: string[] = [];
  lines.push("# WCN Cloud — Customer API reference");
  lines.push("");
  lines.push("Base URL: `https://console.western-communication.com/api/customers/{slug}`");
  lines.push("Auth: `Authorization: Bearer wcn_<prefix>_<random>` — token must carry the `scope` the route declares (resource:level, where write implies read and admin implies write).");
  lines.push("Replace `{slug}` with the customer slug (visible in the console URL).");
  lines.push("");
  for (const s of SECTIONS) {
    lines.push(`## ${s.title}`);
    if (s.intro) {
      // Strip wrapping whitespace; keep markdown.
      lines.push(s.intro.trim());
    }
    lines.push("");
    for (const e of s.endpoints ?? []) {
      lines.push(`### ${e.method} ${e.path}`);
      if (e.scope) lines.push(`Scope: \`${e.scope}\``);
      lines.push(e.description);
      if (e.params?.length) {
        lines.push("");
        lines.push("Parameters:");
        for (const p of e.params) {
          const req = p.required ? "**required**" : "optional";
          lines.push(`- \`${p.name}\` (${p.in}, ${p.type}, ${req}) — ${p.description}`);
        }
      }
      if (e.examples.response) {
        lines.push("");
        lines.push("Example response:");
        lines.push("```json");
        lines.push(e.examples.response);
        lines.push("```");
      }
      lines.push("");
    }
    lines.push("");
  }
  return lines.join("\n");
}

/* Flat list of [section.id, endpoint?.id] for the scroll-spy. */
type AnchorRef = { id: string; sectionId: string; endpointId?: string };

function buildAnchors(): AnchorRef[] {
  const out: AnchorRef[] = [];
  for (const s of SECTIONS) {
    out.push({ id: s.id, sectionId: s.id });
    if (s.endpoints) {
      for (const e of s.endpoints) {
        out.push({
          id: `${s.id}--${e.id}`,
          sectionId: s.id,
          endpointId: e.id,
        });
      }
    }
  }
  return out;
}

/* Find the currently-focused endpoint based on the active anchor — used to
 * drive the right-hand code panel. Falls back to the first endpoint in the
 * active section if no specific endpoint is in view. */
function findActiveEndpoint(activeId: string): Endpoint | null {
  for (const s of SECTIONS) {
    if (!s.endpoints) continue;
    if (activeId === s.id) {
      return s.endpoints[0] ?? null;
    }
    for (const e of s.endpoints) {
      if (`${s.id}--${e.id}` === activeId) return e;
    }
  }
  return null;
}

/* Tiny markdown-ish renderer: paragraphs, fenced code blocks, inline code,
 * and pipe tables. Good enough for our docs without pulling in markdown-it. */
function renderProse(text: string) {
  const parts: React.ReactNode[] = [];
  const blocks = text.split(/\n\n+/);
  blocks.forEach((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Fenced code block (```lang\n…\n```)
    const fence = /^```(\w+)?\n([\s\S]*?)\n```$/.exec(trimmed);
    if (fence) {
      parts.push(
        <pre key={i} className="api-doc-codeblock">
          <code>{fence[2]}</code>
        </pre>,
      );
      return;
    }

    // Pipe table (|h|h|\n|--|--|\n|c|c|)
    if (trimmed.startsWith("|") && trimmed.includes("\n|--")) {
      const lines = trimmed.split("\n");
      const head = lines[0].split("|").slice(1, -1).map((s) => s.trim());
      const body = lines.slice(2).map((l) =>
        l.split("|").slice(1, -1).map((s) => s.trim()),
      );
      parts.push(
        <div key={i} className="api-doc-table-wrap">
          <table className="api-doc-table">
            <thead>
              <tr>
                {head.map((h, hi) => (
                  <th key={hi}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td key={ci}>{renderInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      return;
    }

    // Plain paragraph with inline `code`, **bold**, [links](url)
    parts.push(
      <p key={i} className="api-doc-p">
        {renderInline(trimmed)}
      </p>,
    );
  });
  return parts;
}

function renderInline(text: string): React.ReactNode {
  // Order matters: code first (so its content isn't bolded), then links, then bold.
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  // eslint-disable-next-line no-useless-escape
  const re = /(`[^`]+`)|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)/g;
  let m;
  while ((m = re.exec(text)) != null) {
    if (m.index > i) out.push(text.slice(i, m.index));
    const seg = m[0];
    if (seg.startsWith("`")) {
      out.push(<code key={key++} className="api-doc-inline-code">{seg.slice(1, -1)}</code>);
    } else if (seg.startsWith("[")) {
      const linkM = /\[([^\]]+)\]\(([^)]+)\)/.exec(seg);
      if (linkM) out.push(
        <Link key={key++} href={linkM[2]} className="api-doc-link">
          {linkM[1]}
        </Link>,
      );
    } else if (seg.startsWith("**")) {
      out.push(<strong key={key++}>{seg.slice(2, -2)}</strong>);
    }
    i = m.index + seg.length;
  }
  if (i < text.length) out.push(text.slice(i));
  return out;
}

function AiCopyButton() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="vm-action-group" role="group" aria-label="AI" style={{ marginBottom: 10 }}>
      <button
        type="button"
        className="vm-action vm-action--restart"
        title="Copy a markdown spec of every endpoint — paste into Claude / Cursor / ChatGPT as context for an MCP-style agent that drives the WCN Cloud Customer API."
        onClick={async () => {
          await navigator.clipboard.writeText(buildAiSpec());
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <span aria-hidden style={{ marginRight: 4 }}>🤖</span>
        <span>{copied ? "Copied!" : "Copy spec for AI"}</span>
      </button>
    </div>
  );
}

function MethodBadge({ method }: { method: Method }) {
  return (
    <span
      className="api-doc-method"
      style={{ "--method-tone": METHOD_TONE[method] } as React.CSSProperties}
    >
      {method}
    </span>
  );
}

function CodeBlock({
  lang,
  code,
  label,
}: {
  lang: "bash" | "js" | "json";
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="api-doc-codeblock-wrap">
      {label && (
        <div className="api-doc-codeblock-label">
          <span>{label}</span>
        </div>
      )}
      <pre className={`api-doc-codeblock api-doc-codeblock--${lang}`}>
        <button
          type="button"
          className="api-doc-copy"
          onClick={() => {
            navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
          title="Copy"
        >
          {copied ? "copied" : "copy"}
        </button>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocsView() {
  const [lang, setLang] = useState<Lang>("curl");
  const [activeId, setActiveId] = useState<string>(SECTIONS[0]?.id ?? "");
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const anchors = useMemo(() => buildAnchors(), []);

  // Press "/" to focus search (skip if user is typing in another input).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Filter sections + endpoints by query. Matches across section title,
  // endpoint title, method, path, scope, description — same coverage as the
  // command palette so users can find the same thing either way.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SECTIONS;
    const hit = (s: string | undefined) => !!s && s.toLowerCase().includes(needle);
    return SECTIONS.map((s) => {
      const sectionMatch = hit(s.title) || hit(s.intro);
      const matchedEndpoints = (s.endpoints ?? []).filter((e) =>
        sectionMatch ||
        hit(e.title) ||
        hit(e.path) ||
        hit(e.method) ||
        hit(e.scope) ||
        hit(e.description),
      );
      if (sectionMatch || matchedEndpoints.length > 0) {
        return { ...s, endpoints: sectionMatch ? s.endpoints : matchedEndpoints };
      }
      return null;
    }).filter((s): s is Section => s !== null);
  }, [q]);

  // Scroll-spy: pick the active anchor as the one closest to the top of the
  // viewport that's already past the threshold.
  useEffect(() => {
    if (!containerRef.current) return;
    const elements: HTMLElement[] = [];
    for (const a of anchors) {
      const el = document.getElementById(a.id);
      if (el) elements.push(el);
    }
    const io = new IntersectionObserver(
      () => {
        let best: { id: string; top: number } | null = null;
        for (const el of elements) {
          const r = el.getBoundingClientRect();
          // The 'active' region is anything whose top is within
          // [- viewport*0.4, + viewport*0.5]. Pick the one closest to the
          // 30% line.
          const targetLine = window.innerHeight * 0.3;
          if (r.top - targetLine < 0 && r.bottom > 0) {
            const d = Math.abs(r.top - targetLine);
            if (!best || d < best.top) best = { id: el.id, top: d };
          }
        }
        if (best) setActiveId(best.id);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-30% 0px -60% 0px" },
    );
    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [anchors]);

  const activeEndpoint = findActiveEndpoint(activeId);
  const activeSectionId = activeId.includes("--")
    ? activeId.split("--")[0]
    : activeId;

  return (
    <div className="api-docs-layout">
      {/* ── LEFT NAV ────────────────────────────────────────────────── */}
      <nav className="api-docs-nav" aria-label="API sections">
        <AiCopyButton />

        <div style={{ position: "relative", marginTop: 12, marginBottom: 14 }}>
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search endpoints…"
            spellCheck={false}
            className="type-mono"
            style={{
              width: "100%",
              padding: "8px 30px 8px 11px",
              fontSize: 12.5,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 3,
              color: "var(--text)",
            }}
          />
          {q ? (
            <button
              type="button"
              onClick={() => { setQ(""); searchRef.current?.focus(); }}
              title="Clear"
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: 0,
                color: "var(--text-4)",
                cursor: "pointer",
                fontSize: 14,
                padding: "2px 6px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          ) : (
            <span
              aria-hidden
              className="type-mono"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 10,
                color: "var(--text-4)",
                border: "1px solid var(--line)",
                borderRadius: 3,
                padding: "1px 5px",
                pointerEvents: "none",
              }}
            >
              /
            </span>
          )}
        </div>

        <p className="type-eyebrow" style={{ marginBottom: 10 }}>
          § REFERENCE
          {q && (
            <span style={{ marginLeft: 8, color: "var(--text-4)" }}>
              {filtered.reduce((n, s) => n + (s.endpoints?.length ?? 0), 0)} match
            </span>
          )}
        </p>

        {filtered.length === 0 ? (
          <p
            className="type-mono"
            style={{ fontSize: 12, color: "var(--text-3)", padding: "12px 4px" }}
          >
            No endpoint matches <code>{q}</code>.
          </p>
        ) : (
          <ul>
            {filtered.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`api-docs-nav-section${activeSectionId === s.id ? " is-active" : ""}`}
                >
                  {s.title}
                </a>
                {s.endpoints && (
                  <ul>
                    {s.endpoints.map((e) => (
                      <li key={e.id}>
                        <a
                          href={`#${s.id}--${e.id}`}
                          className={`api-docs-nav-endpoint${activeId === `${s.id}--${e.id}` ? " is-active" : ""}`}
                        >
                          <MethodBadge method={e.method} />
                          <span>{e.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* ── MIDDLE: PROSE + ENDPOINT DETAILS ────────────────────────── */}
      <div className="api-docs-main" ref={containerRef}>
        {SECTIONS.map((s) => (
          <SectionBlock key={s.id} section={s} />
        ))}
      </div>

      {/* ── RIGHT: STICKY CODE PANEL ─────────────────────────────────── */}
      <aside className="api-docs-code">
        <div className="api-docs-code-inner">
          <div className="api-docs-code-tabs" role="tablist">
            {(["curl", "js"] as Lang[]).map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={lang === l}
                type="button"
                className={`api-docs-code-tab${lang === l ? " is-active" : ""}`}
                onClick={() => setLang(l)}
              >
                {l === "curl" ? "curl" : "JavaScript"}
              </button>
            ))}
          </div>

          {activeEndpoint ? (
            <>
              <CodeBlock
                lang={lang === "curl" ? "bash" : "js"}
                code={lang === "curl" ? activeEndpoint.examples.curl : activeEndpoint.examples.js}
                label={`Request — ${activeEndpoint.method} ${activeEndpoint.path}`}
              />
              {activeEndpoint.examples.response && (
                <CodeBlock
                  lang="json"
                  code={activeEndpoint.examples.response}
                  label="Response"
                />
              )}
            </>
          ) : (
            <div className="api-docs-code-empty">
              Pick an endpoint on the left to see request / response examples.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <section
      id={section.id}
      className="api-doc-section"
      style={{ scrollMarginTop: 24 }}
    >
      <h2 className="api-doc-section-title">{section.title}</h2>
      {section.intro && (
        <div className="api-doc-prose">{renderProse(section.intro)}</div>
      )}
      {section.endpoints &&
        section.endpoints.map((e) => (
          <EndpointBlock key={e.id} section={section} endpoint={e} />
        ))}
    </section>
  );
}

function EndpointBlock({ section, endpoint }: { section: Section; endpoint: Endpoint }) {
  const [copied, setCopied] = useState(false);
  const anchor = `${section.id}--${endpoint.id}`;
  return (
    <article
      id={anchor}
      className="api-doc-endpoint"
      style={{ scrollMarginTop: 24 }}
    >
      <h3 className="api-doc-endpoint-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <MethodBadge method={endpoint.method} />
        <code className="api-doc-endpoint-path">{endpoint.path}</code>
        <span className="api-doc-endpoint-name" style={{ flex: 1 }}>{endpoint.title}</span>
        <button
          type="button"
          title="Copy link to this endpoint"
          aria-label="Copy link to this endpoint"
          onClick={async () => {
            const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: 3,
            color: copied ? "var(--ok)" : "var(--text-3)",
            fontSize: 11,
            padding: "3px 8px",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "✓ copied" : "#  link"}
        </button>
      </h3>
      <div className="api-doc-prose">{renderProse(endpoint.description)}</div>
      {endpoint.scope && (
        <p className="api-doc-scope">
          Required scope: <code>{endpoint.scope}</code>
        </p>
      )}
      {endpoint.params && endpoint.params.length > 0 && (
        <div className="api-doc-params">
          <p className="type-eyebrow" style={{ marginBottom: 8 }}>
            § PARAMETERS
          </p>
          <table className="api-doc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>In</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoint.params.map((p) => (
                <tr key={p.name}>
                  <td>
                    <code className="api-doc-inline-code">{p.name}</code>
                    {p.required && <span className="api-doc-required"> required</span>}
                  </td>
                  <td>{p.in}</td>
                  <td>{p.type}</td>
                  <td>{renderInline(p.description)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
