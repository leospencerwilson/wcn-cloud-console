"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import LogStream, { type LogEvent } from "@/components/log-stream";
import { statusPill } from "@/lib/utils";

type Props = {
  slug: string;
  appId: string;
  deployId: string;
  initialStatus: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export default function DeployLogView({
  slug,
  appId,
  deployId,
  initialStatus,
  startedAt,
  finishedAt,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [finished, setFinished] = useState<string | null>(finishedAt);

  const source = useMemo(
    () => ({
      key: `${appId}/${deployId}`,
      method: "GET" as const,
      url: `/api/customers/${slug}/apps/${appId}/deployments/${deployId}/logs`,
    }),
    [slug, appId, deployId],
  );

  function onEvent(e: LogEvent) {
    if (e.type === "done") {
      const data = e.data as { status?: string; finished_at?: string } | undefined;
      if (data?.status) setStatus(data.status);
      if (data?.finished_at) setFinished(data.finished_at);
    }
  }

  return (
    <Card>
      <div className="px-6 py-4 space-y-1 border-b" style={{ borderColor: "var(--color-hairline)" }}>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="type-eyebrow">§ DEPLOYMENT</span>
          <span className="type-mono text-[12px]">{deployId}</span>
          <span className={statusPill(status)}>{status}</span>
        </div>
        <p className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
          started {startedAt ? new Date(startedAt).toLocaleString() : "—"}
          {finished ? ` · finished ${new Date(finished).toLocaleString()}` : ""}
        </p>
      </div>
      <div className="px-2 py-2">
        <LogStream source={source} height={520} onEvent={onEvent} emptyText="(waiting for build output…)" />
      </div>
    </Card>
  );
}
