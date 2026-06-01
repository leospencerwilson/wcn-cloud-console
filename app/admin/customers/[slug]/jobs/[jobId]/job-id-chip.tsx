"use client";

import { useState } from "react";

export function JobIdChip({ jobId }: { jobId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(jobId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-baseline">
      <span className="type-mono" title={jobId}>
        {jobId.slice(0, 8)}…
      </span>
      <button
        type="button"
        onClick={copy}
        className="type-mono text-[10px] px-1.5 py-0.5 hover:opacity-60 transition-opacity"
        style={{
          border: "1px solid var(--color-rule)",
          color: "var(--color-muted)",
          letterSpacing: "0.08em",
        }}
        aria-label="Copy full job id"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </span>
  );
}
