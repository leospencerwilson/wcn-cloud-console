"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { IconRestart, IconSave, IconX, IconCheck } from "@/components/ui/icons";
import type { VmPower } from "@/lib/provisioner/vms-client";

const LIMITS = {
  cores: { min: 1, max: 32, step: 1 },
  memory_mb: { min: 512, max: 65536, step: 512 },
  disk_gb: { min: 10, max: 2000, step: 10 },
} as const;

function mbFromBytes(b: number): number {
  return Math.round(b / (1024 * 1024));
}
function gbFromBytes(b: number): number {
  return Math.round(b / (1024 * 1024 * 1024));
}

export default function ResizeCard({ slug }: { slug: string }) {
  const [power, setPower] = useState<VmPower | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [cores, setCores] = useState<number>(0);
  const [memoryMb, setMemoryMb] = useState<number>(0);
  const [diskGb, setDiskGb] = useState<number>(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const loadPower = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${slug}/vm/power`, { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadErr(data.error || `HTTP ${res.status}`);
        return;
      }
      const p = (await res.json()) as VmPower;
      setPower(p);
      setCores(p.cpus);
      setMemoryMb(mbFromBytes(p.maxmem));
      setDiskGb(gbFromBytes(p.maxdisk));
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Network error");
    }
  }, [slug]);

  useEffect(() => {
    loadPower();
  }, [loadPower]);

  if (loadErr) {
    return (
      <Card>
        <div className="px-6 py-6 space-y-2">
          <p className="type-eyebrow">§ COULD NOT LOAD VM</p>
          <p className="type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
            {loadErr}
          </p>
        </div>
      </Card>
    );
  }

  if (!power) {
    return (
      <Card>
        <p className="px-6 py-6 type-mono text-[12px]" style={{ color: "var(--color-muted)" }}>
          Loading current specs…
        </p>
      </Card>
    );
  }

  const currentCores = power.cpus;
  const currentMb = mbFromBytes(power.maxmem);
  const currentGb = gbFromBytes(power.maxdisk);

  const changed =
    cores !== currentCores || memoryMb !== currentMb || diskGb !== currentGb;
  const needsRestart = cores !== currentCores || memoryMb !== currentMb;
  const diskShrink = diskGb < currentGb;

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, number> = {};
      if (cores !== currentCores) body.cores = cores;
      if (memoryMb !== currentMb) body.memory_mb = memoryMb;
      if (diskGb !== currentGb) body.disk_gb = diskGb;
      const res = await fetch(`/api/customers/${slug}/vm/resize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      const result = (await res.json()) as { needs_restart?: boolean };
      setConfirmOpen(false);
      setToast(
        result.needs_restart
          ? "Resize queued. CPU/memory take effect after the VM restarts."
          : "Resize queued. Changes are applying.",
      );
      setTimeout(() => loadPower(), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRestart() {
    setRestarting(true);
    try {
      const res = await fetch(`/api/customers/${slug}/vm/restart`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setToast("Restart queued.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRestarting(false);
    }
  }

  return (
    <Card>
      <div
        className="px-6 py-3 border-b flex items-baseline justify-between"
        style={{ borderColor: "var(--color-hairline)" }}
      >
        <span className="type-eyebrow">§ RESIZE VM</span>
        <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
          vmid {power.vmid} · {power.proxmox_node}
        </span>
      </div>
      <div className="px-6 py-5 space-y-5">
        <Row
          label="CPU cores"
          current={currentCores}
          value={cores}
          setValue={setCores}
          min={LIMITS.cores.min}
          max={LIMITS.cores.max}
          step={LIMITS.cores.step}
          unit=""
        />
        <Row
          label="Memory"
          current={currentMb}
          value={memoryMb}
          setValue={setMemoryMb}
          min={LIMITS.memory_mb.min}
          max={LIMITS.memory_mb.max}
          step={LIMITS.memory_mb.step}
          unit=" MB"
        />
        <Row
          label="Disk"
          current={currentGb}
          value={diskGb}
          setValue={setDiskGb}
          min={Math.max(LIMITS.disk_gb.min, currentGb)}
          max={LIMITS.disk_gb.max}
          step={LIMITS.disk_gb.step}
          unit=" GB"
          help="Shrinking disks is not supported."
        />

        {diskShrink && (
          <p
            className="type-mono text-[12px]"
            style={{ color: "var(--color-danger, #b03020)" }}
          >
            Disk shrink isn't supported — minimum is the current size ({currentGb} GB).
          </p>
        )}

        {error && (
          <p
            className="type-mono text-[12px]"
            style={{ color: "var(--color-danger, #b03020)" }}
          >
            {error}
          </p>
        )}

        {toast && (
          <div
            className="type-mono text-[12px] px-4 py-3 flex items-center justify-between gap-3"
            style={{
              background: "rgba(40,90,40,0.08)",
              color: "var(--color-ink)",
              borderRadius: 2,
            }}
          >
            <span>{toast}</span>
            {needsRestart && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onRestart}
                disabled={restarting}
              >
                <IconRestart />
                {restarting ? "Restarting…" : "Restart now"}
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!changed || diskShrink}
            onClick={() => setConfirmOpen(true)}
          >
            <IconSave />
            Resize
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 50 }}
          onClick={() => !submitting && setConfirmOpen(false)}
        >
          <Card>
            <div
              className="px-6 py-5 space-y-3 max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="type-eyebrow">§ CONFIRM RESIZE</p>
              <ul className="type-mono text-[12px] space-y-1">
                {cores !== currentCores && (
                  <li>
                    cores: {currentCores} → {cores}
                  </li>
                )}
                {memoryMb !== currentMb && (
                  <li>
                    memory: {currentMb} → {memoryMb} MB
                  </li>
                )}
                {diskGb !== currentGb && (
                  <li>
                    disk: {currentGb} → {diskGb} GB (grow, irreversible)
                  </li>
                )}
              </ul>
              {needsRestart && (
                <p
                  className="type-mono text-[11px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  CPU/memory changes need a VM restart to take effect.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirmOpen(false)}
                  disabled={submitting}
                >
                  <IconX />
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onSubmit}
                  disabled={submitting}
                >
                  <IconCheck />
                  {submitting ? "Resizing…" : "Confirm"}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}

function Row({
  label,
  current,
  value,
  setValue,
  min,
  max,
  step,
  unit,
  help,
}: {
  label: string;
  current: number;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="type-eyebrow text-[11px]">{label}</span>
        <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
          current: {current}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="type-mono text-[13px] w-24 px-2 py-1"
          style={{
            background: "transparent",
            border: "1px solid var(--color-hairline)",
            borderRadius: 2,
          }}
        />
        <span className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
          {unit.trim()}
        </span>
      </div>
      {help && (
        <p className="type-mono text-[11px]" style={{ color: "var(--color-muted)" }}>
          {help}
        </p>
      )}
    </div>
  );
}
