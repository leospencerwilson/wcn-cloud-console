"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRefresh } from "@/components/ui/icons";
import LogStream from "@/components/log-stream";

const TAIL_PRESETS = [100, 300, 1000];

export default function RuntimeLogsView({
  slug,
  appId,
}: {
  slug: string;
  appId: string;
}) {
  const [tail, setTail] = useState<number>(300);
  const [streamKey, setStreamKey] = useState(0);

  const source = useMemo(
    () => ({
      key: `${appId}/${tail}/${streamKey}`,
      method: "GET" as const,
      url: `/api/customers/${slug}/apps/${appId}/logs?follow=1&tail=${tail}`,
    }),
    [slug, appId, tail, streamKey],
  );

  return (
    <Card>
      <div
        className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap border-b"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">§ RUNTIME LOGS</span>
        <div className="flex items-center gap-3">
          <label
            className="type-mono text-[11px] flex items-center gap-2"
            style={{ color: "var(--color-muted)" }}
          >
            tail
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="type-mono text-[11px] px-2 py-1"
              style={{
                background: "transparent",
                border: "1px solid var(--color-hairline)",
                color: "var(--color-ink)",
                borderRadius: 2,
              }}
            >
              {TAIL_PRESETS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setStreamKey((k) => k + 1)}
          >
            <IconRefresh />
            Reconnect
          </button>
        </div>
      </div>
      <div className="px-2 py-2">
        <LogStream source={source} height={560} emptyText="(connecting to container…)" />
      </div>
    </Card>
  );
}
