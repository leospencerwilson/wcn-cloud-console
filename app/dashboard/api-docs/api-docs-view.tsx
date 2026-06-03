"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SECTIONS,
  API_BASE_URL,
  PLACEHOLDER_SLUG,
  type Endpoint,
  type ErrorEntry,
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

// Build a minimal-but-valid OpenAPI 3.1 document from SECTIONS. Imports
// cleanly into Postman / Insomnia / openapi-generator.
function buildOpenApi(): unknown {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const s of SECTIONS) {
    for (const e of s.endpoints ?? []) {
      // OpenAPI uses {param} placeholders too — our paths already match.
      const path = e.path;
      const op: Record<string, unknown> = {
        operationId: `${s.id}-${e.id}`,
        summary: e.title,
        description: e.description,
        tags: [s.title],
      };
      if (e.scope) op["x-scope"] = e.scope;
      if (e.since) op["x-since"] = e.since;
      const parameters: unknown[] = [];
      const pathParams = (path.match(/\{([^}]+)\}/g) ?? []).map((m) => m.slice(1, -1));
      for (const p of pathParams) {
        parameters.push({
          name: p,
          in: "path",
          required: true,
          schema: { type: "string" },
        });
      }
      for (const p of e.params ?? []) {
        if (p.in === "path" || p.in === "query" || p.in === "header") {
          if (p.in === "path" && pathParams.includes(p.name)) continue;
          parameters.push({
            name: p.name,
            in: p.in,
            required: p.required ?? false,
            description: p.description,
            schema: { type: jsonTypeFor(p.type) },
          });
        }
      }
      if (parameters.length > 0) op.parameters = parameters;

      const bodyParams = (e.params ?? []).filter((p) => p.in === "body");
      if (bodyParams.length > 0 || (e.method !== "GET" && e.method !== "DELETE" && e.tryBody)) {
        const properties: Record<string, unknown> = {};
        const required: string[] = [];
        for (const p of bodyParams) {
          properties[p.name] = { type: jsonTypeFor(p.type), description: p.description };
          if (p.required) required.push(p.name);
        }
        op.requestBody = {
          required: required.length > 0,
          content: {
            "application/json": {
              schema: {
                type: "object",
                ...(Object.keys(properties).length > 0 ? { properties } : {}),
                ...(required.length > 0 ? { required } : {}),
              },
              ...(e.tryBody ? { example: e.tryBody } : {}),
            },
          },
        };
      }

      const responses: Record<string, unknown> = {
        "200": { description: "OK" },
      };
      if (e.examples.response) {
        try {
          responses["200"] = {
            description: "OK",
            content: { "application/json": { example: JSON.parse(e.examples.response) } },
          };
        } catch {
          responses["200"] = { description: "OK" };
        }
      }
      op.responses = responses;

      const slot = (paths[path] ||= {});
      slot[e.method.toLowerCase()] = op;
    }
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "WCN Cloud Customer API",
      description: "Generated from the live console docs.",
      version: new Date().toISOString().slice(0, 10),
    },
    servers: [
      {
        url: `${API_BASE_URL}/{slug}`,
        description: "WCN Cloud",
        variables: { slug: { default: PLACEHOLDER_SLUG, description: "Your customer slug" } },
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "wcn_<prefix>_<random>" },
      },
    },
    security: [{ bearerAuth: [] }],
    paths,
  };
}

function jsonTypeFor(t: string): string {
  const s = (t || "").toLowerCase();
  if (s.includes("number") || s.includes("int")) return "integer";
  if (s.includes("bool")) return "boolean";
  if (s.includes("array") || s.endsWith("[]")) return "array";
  if (s.includes("object")) return "object";
  return "string";
}

function OpenApiDownloadButton() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="vm-action-group" role="group" aria-label="OpenAPI" style={{ marginBottom: 8 }}>
      <button
        type="button"
        className="vm-action vm-action--view"
        title="Download an OpenAPI 3.1 spec — import into Postman, Insomnia, or openapi-generator to get a typed SDK in 20+ languages."
        onClick={() => {
          setBusy(true);
          try {
            const spec = buildOpenApi();
            const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "wcn-cloud-openapi.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          } finally {
            setTimeout(() => setBusy(false), 600);
          }
        }}
      >
        <span aria-hidden style={{ marginRight: 4 }}>↓</span>
        <span>{busy ? "Generating…" : "Download OpenAPI 3.1"}</span>
      </button>
    </div>
  );
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

export default function ApiDocsView({ slug }: { slug: string }) {
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
    return SECTIONS.map((s): Section | null => {
      const sectionMatch = hit(s.title) || hit(s.intro);
      // Also match against the section's error codes / when text so users
      // can search for e.g. "missing_scope" and land on the Errors section.
      const errorMatch =
        !!s.errors &&
        s.errors.some((er) => hit(er.code) || hit(er.when) || hit(String(er.http)));
      const matchedEndpoints = (s.endpoints ?? []).filter((e) =>
        sectionMatch ||
        hit(e.title) ||
        hit(e.path) ||
        hit(e.method) ||
        hit(e.scope) ||
        hit(e.description),
      );
      if (sectionMatch || errorMatch || matchedEndpoints.length > 0) {
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
        <OpenApiDownloadButton />

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
          <SectionBlock key={s.id} section={s} slug={slug} />
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

function SectionBlock({ section, slug }: { section: Section; slug: string }) {
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
      {section.errors && section.errors.length > 0 && (
        <ErrorsTable errors={section.errors} />
      )}
      {section.endpoints &&
        section.endpoints.map((e) => (
          <EndpointBlock key={e.id} section={section} endpoint={e} slug={slug} />
        ))}
    </section>
  );
}

// Sortable + filterable error reference. Lives inside the `errors` section
// (or any section that adds an `errors:` field). Sort by code/http/when.
function ErrorsTable({ errors }: { errors: ErrorEntry[] }) {
  type Col = "code" | "http" | "when";
  const [sort, setSort] = useState<{ col: Col; dir: 1 | -1 }>({ col: "code", dir: 1 });
  const [filter, setFilter] = useState("");
  const rows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const filtered = needle
      ? errors.filter(
          (e) =>
            e.code.toLowerCase().includes(needle) ||
            e.when.toLowerCase().includes(needle) ||
            String(e.http).includes(needle),
        )
      : errors;
    const out = [...filtered].sort((a, b) => {
      const ka = sort.col === "http" ? a.http : (a[sort.col] as string).toLowerCase();
      const kb = sort.col === "http" ? b.http : (b[sort.col] as string).toLowerCase();
      if (ka < kb) return -1 * sort.dir;
      if (ka > kb) return 1 * sort.dir;
      return 0;
    });
    return out;
  }, [errors, filter, sort]);

  function toggle(col: Col) {
    setSort((s) => (s.col === col ? { col, dir: (s.dir * -1) as 1 | -1 } : { col, dir: 1 }));
  }
  function caret(col: Col) {
    if (sort.col !== col) return "";
    return sort.dir === 1 ? " ▲" : " ▼";
  }

  return (
    <div className="api-doc-params" style={{ marginTop: 14 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
        <p className="type-eyebrow" style={{ margin: 0 }}>
          § ERROR CATALOGUE ({errors.length})
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="filter errors…"
          spellCheck={false}
          className="type-mono"
          style={{
            padding: "5px 10px",
            fontSize: 11.5,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 3,
            color: "var(--text)",
            minWidth: 200,
          }}
        />
      </div>
      <table className="api-doc-table">
        <thead>
          <tr>
            <th
              onClick={() => toggle("code")}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              code{caret("code")}
            </th>
            <th
              onClick={() => toggle("http")}
              style={{ cursor: "pointer", userSelect: "none", width: 70 }}
            >
              http{caret("http")}
            </th>
            <th
              onClick={() => toggle("when")}
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              when{caret("when")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.code}>
              <td>
                <code className="api-doc-inline-code">{e.code}</code>
              </td>
              <td>
                <span
                  className="type-mono"
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 3,
                    border: "1px solid var(--line)",
                    color:
                      e.http >= 500 ? "var(--crit)" : e.http >= 400 ? "var(--warn)" : "var(--ok)",
                  }}
                >
                  {e.http}
                </span>
              </td>
              <td>{renderInline(e.when)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} style={{ color: "var(--text-3)", padding: "10px 4px" }}>
                No errors match <code>{filter}</code>.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function EndpointBlock({
  section,
  endpoint,
  slug,
}: {
  section: Section;
  endpoint: Endpoint;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);
  const anchor = `${section.id}--${endpoint.id}`;
  const recentlyUpdated = isRecentlyUpdated(endpoint);
  return (
    <article
      id={anchor}
      className="api-doc-endpoint"
      style={{ scrollMarginTop: 24 }}
    >
      <h3 className="api-doc-endpoint-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <MethodBadge method={endpoint.method} />
        <code className="api-doc-endpoint-path">{endpoint.path}</code>
        <span className="api-doc-endpoint-name" style={{ flex: 1 }}>{endpoint.title}</span>
        {endpoint.since && (
          <span
            className="type-mono"
            title={`Available since ${endpoint.since}`}
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              border: "1px solid var(--line)",
              color: "var(--text-3)",
            }}
          >
            since {endpoint.since}
          </span>
        )}
        {recentlyUpdated && (
          <span
            className="type-mono"
            title={recentlyUpdated.note}
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              background: "color-mix(in oklch, var(--brand) 18%, transparent)",
              border: "1px solid color-mix(in oklch, var(--brand) 40%, var(--line))",
              color: "var(--brand)",
            }}
          >
            updated {recentlyUpdated.date}
          </span>
        )}
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
      {endpoint.changed && endpoint.changed.length > 0 && (
        <details
          className="api-doc-prose"
          style={{
            marginTop: 6,
            padding: "8px 12px",
            border: "1px solid var(--line)",
            borderRadius: 3,
            background: "var(--bg-2)",
          }}
        >
          <summary
            className="type-eyebrow"
            style={{ cursor: "pointer", listStyle: "revert", color: "var(--text-3)" }}
          >
            § CHANGELOG ({endpoint.changed.length})
          </summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {endpoint.changed.map((c, i) => (
              <li key={`${c.date}-${i}`} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <code
                  className="api-doc-inline-code"
                  style={{ marginRight: 8, fontSize: 11 }}
                >
                  {c.date}
                </code>
                <span style={{ color: "var(--text-2)" }}>{renderInline(c.note)}</span>
              </li>
            ))}
          </ul>
        </details>
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
      <TryItPanel endpoint={endpoint} slug={slug} />
    </article>
  );
}

// "Recent" = within the last 30 days. Pick the most recent changelog entry.
function isRecentlyUpdated(endpoint: Endpoint): { date: string; note: string } | null {
  if (!endpoint.changed || endpoint.changed.length === 0) return null;
  const latest = [...endpoint.changed].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!latest) return null;
  const today = new Date();
  const ld = new Date(latest.date + "T00:00:00Z");
  if (Number.isNaN(ld.getTime())) return null;
  const ageDays = (today.getTime() - ld.getTime()) / 86400000;
  if (ageDays > 30 || ageDays < -1) return null;
  return latest;
}

// Try-it: hits the endpoint as the current logged-in user via cookie auth.
// Path params get text inputs (pre-filled with the user's own slug for
// {slug}); non-GET methods get a JSON body textarea seeded from tryBody.
function TryItPanel({ endpoint, slug }: { endpoint: Endpoint; slug: string }) {
  const pathParamNames = useMemo(
    () => (endpoint.path.match(/\{([^}]+)\}/g) ?? []).map((m) => m.slice(1, -1)),
    [endpoint.path],
  );
  const [pathParams, setPathParams] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const p of pathParamNames) {
      seed[p] = p === "slug" ? slug : "";
    }
    return seed;
  });
  const [queryStr, setQueryStr] = useState("");
  const [body, setBody] = useState<string>(() => {
    if (endpoint.tryBody !== undefined) {
      try {
        return JSON.stringify(endpoint.tryBody, null, 2);
      } catch {
        return "";
      }
    }
    return "";
  });
  const [resp, setResp] = useState<{
    status: number;
    ok: boolean;
    body: string;
    ms: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasBody = endpoint.method !== "GET" && endpoint.method !== "DELETE";

  function resolvedPath(): string {
    let p = endpoint.path;
    for (const name of pathParamNames) {
      p = p.replaceAll(`{${name}}`, encodeURIComponent(pathParams[name] ?? ""));
    }
    return p + (queryStr ? (queryStr.startsWith("?") ? queryStr : `?${queryStr}`) : "");
  }

  async function run() {
    setBusy(true);
    setErr(null);
    setResp(null);
    const start = performance.now();
    try {
      const url = `${API_BASE_URL}${resolvedPath()}`;
      const init: RequestInit = {
        method: endpoint.method,
        credentials: "include",
        headers: hasBody ? { "Content-Type": "application/json" } : {},
      };
      if (hasBody && body.trim()) {
        try {
          JSON.parse(body); // validate
        } catch (e) {
          throw new Error(`Body is not valid JSON: ${(e as Error).message}`);
        }
        init.body = body;
      }
      const r = await fetch(url, init);
      const text = await r.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* not JSON, keep raw */
      }
      setResp({
        status: r.status,
        ok: r.ok,
        body: pretty,
        ms: Math.round(performance.now() - start),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details
      className="api-doc-tryit"
      style={{
        marginTop: 14,
        padding: "12px 14px",
        border: "1px solid var(--line)",
        borderRadius: 3,
        background: "var(--surface)",
      }}
    >
      <summary
        className="type-eyebrow"
        style={{ cursor: "pointer", listStyle: "revert", color: "var(--text-2)" }}
      >
        ▸ TRY IT — run this as your user
      </summary>
      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {pathParamNames.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, alignItems: "center" }}>
            {pathParamNames.map((name) => (
              <PathParamRow
                key={name}
                name={name}
                value={pathParams[name] ?? ""}
                onChange={(v) => setPathParams((s) => ({ ...s, [name]: v }))}
              />
            ))}
          </div>
        )}
        <label
          className="type-mono"
          style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, alignItems: "center", fontSize: 11 }}
        >
          <span style={{ color: "var(--text-3)" }}>query</span>
          <input
            value={queryStr}
            onChange={(e) => setQueryStr(e.target.value)}
            spellCheck={false}
            placeholder="e.g. ?limit=10"
            style={{
              padding: "5px 8px",
              fontSize: 12,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: 3,
              color: "var(--text)",
              fontFamily: "var(--font-mono)",
            }}
          />
        </label>
        {hasBody && (
          <label className="type-mono" style={{ fontSize: 11 }}>
            <span style={{ color: "var(--text-3)", display: "block", marginBottom: 4 }}>body (JSON)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              rows={Math.min(10, Math.max(3, body.split("\n").length))}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 12,
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: 3,
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                resize: "vertical",
              }}
            />
          </label>
        )}
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <div className="vm-action-group" role="group" aria-label="Try-it actions">
            <button
              type="button"
              className="vm-action vm-action--start"
              disabled={busy}
              onClick={run}
            >
              {busy ? "Running…" : `Run ${endpoint.method}`}
            </button>
            <button
              type="button"
              className="vm-action vm-action--view"
              onClick={() => {
                setResp(null);
                setErr(null);
              }}
            >
              Clear
            </button>
          </div>
          <code className="type-mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
            {endpoint.method} {API_BASE_URL}
            {resolvedPath()}
          </code>
        </div>
        {err && (
          <p className="type-mono" style={{ fontSize: 12, color: "var(--crit)" }}>
            {err}
          </p>
        )}
        {resp && (
          <div style={{ marginTop: 4 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <span
                className="type-mono"
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 3,
                  background: resp.ok
                    ? "color-mix(in oklch, var(--ok) 18%, transparent)"
                    : "color-mix(in oklch, var(--crit) 18%, transparent)",
                  color: resp.ok ? "var(--ok)" : "var(--crit)",
                  border: `1px solid ${resp.ok ? "var(--ok)" : "var(--crit)"}`,
                }}
              >
                {resp.status} {resp.ok ? "OK" : "ERR"}
              </span>
              <span className="type-mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
                {resp.ms} ms
              </span>
            </div>
            <pre
              className="type-mono"
              style={{
                margin: 0,
                padding: "10px 12px",
                fontSize: 11.5,
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: 3,
                color: "var(--text)",
                maxHeight: 320,
                overflow: "auto",
                whiteSpace: "pre",
              }}
            >
              <code>{resp.body || "(empty)"}</code>
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}

function PathParamRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <span className="type-mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
        {`{${name}}`}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={{
          padding: "5px 8px",
          fontSize: 12,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderRadius: 3,
          color: "var(--text)",
          fontFamily: "var(--font-mono)",
        }}
      />
    </>
  );
}
