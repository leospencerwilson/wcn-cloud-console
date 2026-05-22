"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { statusPill } from "@/lib/utils";
import type { VmAction, VmPower } from "@/lib/provisioner/vms-client";

const POLL_INTERVAL_MS = 5000;
const ACTION_TIMEOUT_MS = 60000;

function fmtBytes(n: number): string {
  if (!n) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

function fmtUptime(seconds: number): string {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function VmOperations({ slug }: { slug: string }) {
  const [power, setPower] = useState<VmPower | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<VmAction | null>(null);
  const [confirm, setConfirm] = useState<VmAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${slug}/vm/power`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(data.error || `Failed (${res.status})`);
        return null;
      }
      const p = (await res.json()) as VmPower;
      setPower(p);
      setLoadError(null);
      return p;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Network error");
      return null;
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Background poll while idle (every 5s).
  useEffect(() => {
    if (busy) return;
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [busy, refresh]);

  async function runAction(action: VmAction) {
    setConfirm(null);
    setBusy(action);
    setActionError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setActionError(data.error || `${action} failed (${res.status})`);
        setBusy(null);
        return;
      }
      // Expected end-state per action
      const want = action === "stop" ? "stopped" : "running";
      const deadline = Date.now() + ACTION_TIMEOUT_MS;
      let settled = false;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const p = await refresh();
        if (p && p.state === want) {
          settled = true;
          break;
        }
      }
      if (!settled) {
        setActionError(
          `Action issued but VM didn't reach "${want}" within ${
            ACTION_TIMEOUT_MS / 1000
          }s. Check Proxmox.`,
        );
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  const cpuPct = power ? Math.round(power.cpu * 100) : 0;
  const memPct = power ? Math.round((power.mem / power.maxmem) * 100) : 0;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="type-h2">— OPERATIONS</h2>
        <span className="type-meta">Live VM state · Proxmox</span>
      </div>
      <Card>
        <div className="px-8 py-7 space-y-7">
          {loadError && (
            <p
              className="type-mono text-[12px]"
              style={{ color: "var(--color-danger, #b03020)" }}
            >
              {loadError}
            </p>
          )}

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-7">
            <div>
              <dt className="type-eyebrow mb-3">— STATE</dt>
              <dd>
                {power ? (
                  <span className={statusPill(power.state)}>{power.state}</span>
                ) : (
                  <span className="type-mono text-[14px]">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="type-eyebrow mb-3">— UPTIME</dt>
              <dd className="type-mono text-[14px]">
                {power ? fmtUptime(power.uptime) : "—"}
              </dd>
            </div>
            <div>
              <dt className="type-eyebrow mb-3">— CPU</dt>
              <dd className="type-mono text-[14px]">
                {power ? `${cpuPct}% / ${power.cpus} vCPU` : "—"}
              </dd>
            </div>
            <div>
              <dt className="type-eyebrow mb-3">— MEMORY</dt>
              <dd className="type-mono text-[14px]">
                {power
                  ? `${fmtBytes(power.mem)} / ${fmtBytes(power.maxmem)} (${memPct}%)`
                  : "—"}
              </dd>
            </div>
          </dl>

          <div className="flex items-center gap-3 flex-wrap pt-2 border-t" style={{ borderColor: "var(--color-hairline)" }}>
            <span className="type-eyebrow pt-3" style={{ color: "var(--color-muted)" }}>
              § ACTIONS
            </span>
            <div className="flex-1" />
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!power || busy !== null || power.state !== "running"}
              onClick={() => setConfirm("restart")}
            >
              {busy === "restart" ? "Restarting…" : "Restart"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!power || busy !== null || power.state === "stopped"}
              onClick={() => setConfirm("stop")}
              style={{ color: "var(--color-danger, #b03020)" }}
            >
              {busy === "stop" ? "Stopping…" : "Stop"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!power || busy !== null || power.state === "running"}
              onClick={() => setConfirm("start")}
            >
              {busy === "start" ? "Starting…" : "Start"}
            </button>
          </div>

          {actionError && (
            <p
              className="type-mono text-[12px]"
              style={{ color: "var(--color-danger, #b03020)" }}
            >
              {actionError}
            </p>
          )}
        </div>
      </Card>

      {confirm && (
        <ConfirmDialog
          action={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runAction(confirm)}
        />
      )}
    </section>
  );
}

function ConfirmDialog({
  action,
  onCancel,
  onConfirm,
}: {
  action: VmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const blurbs: Record<VmAction, string> = {
    restart:
      "The VM will be unavailable for ~30 seconds while it reboots. Active sessions will drop.",
    stop:
      "The VM will be powered off. The customer site will be completely unavailable until you start it again.",
    start: "Boot the VM from its current state.",
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Card>
          <div className="px-8 py-7 space-y-5">
            <p className="type-eyebrow">§ CONFIRM {action.toUpperCase()}</p>
            <p
              className="text-[14px] leading-[1.55]"
              style={{ color: "var(--color-muted)" }}
            >
              {blurbs[action]}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                style={
                  action === "stop"
                    ? { background: "var(--color-danger, #b03020)" }
                    : undefined
                }
              >
                Yes, {action} VM
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
