"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { VmActionGroup } from "@/components/vm-action-group";
import type { VmAction, VmPower } from "@/lib/provisioner/vms-client";

const POLL_INTERVAL_MS = 5000;
const ACTION_TIMEOUT_MS = 60000;

export default function VmActionButtons({ slug }: { slug: string }) {
  const [power, setPower] = useState<VmPower | null>(null);
  const [busy, setBusy] = useState<VmAction | null>(null);
  const [confirm, setConfirm] = useState<VmAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${slug}/vm/power`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const p = (await res.json()) as VmPower;
      setPower(p);
      return p;
    } catch {
      return null;
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `${action} failed (${res.status})`);
        setBusy(null);
        return;
      }
      const want = action === "stop" ? "stopped" : "running";
      const deadline = Date.now() + ACTION_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const p = await refresh();
        if (p && p.state === want) break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <VmActionGroup power={power} busy={busy} onAction={setConfirm} />
      {error && (
        <span
          className="type-mono text-[11px]"
          style={{ color: "var(--color-danger, #b03020)" }}
        >
          {error}
        </span>
      )}
      {confirm && (
        <ConfirmDialog
          action={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runAction(confirm)}
        />
      )}
    </>
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
