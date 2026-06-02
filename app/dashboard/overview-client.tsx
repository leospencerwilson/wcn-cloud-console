"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { statusPill } from "@/lib/utils";
import { VmActionGroup } from "@/components/vm-action-group";
import type { VmAction, VmPower } from "@/lib/provisioner/vms-client";
import type { App, AppDomain } from "@/lib/provisioner/types";

type Probe = {
  state: "online" | "offline" | "rebooting" | "checking";
  status: number | null;
  latency_ms: number | null;
  checked_at: string | null;
};

type VmInfo = {
  vmid: number | string;
  ip: string | null;
  status: string;
  proxmox_node: string | null;
};

type DomainCounts = { total: number; active: number; pending: number };

const ACTION_TIMEOUT_MS = 60_000;

function fmtBytes(n: number): string {
  if (!n) return "—";
  const u = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${u[i]}`;
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

function healthTone(state: Probe["state"]) {
  if (state === "online")
    return { color: "var(--ok)", label: "Online" };
  if (state === "rebooting")
    return { color: "var(--warn)", label: "Rebooting" };
  if (state === "offline") return { color: "var(--crit)", label: "Offline" };
  return { color: "var(--text-3)", label: "Checking…" };
}

export default function OverviewClient({
  slug,
  vm,
}: {
  slug: string;
  vm: VmInfo | null;
}) {
  const [power, setPower] = useState<VmPower | null>(null);
  const [apps, setApps] = useState<App[] | null>(null);
  const [domains, setDomains] = useState<DomainCounts | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [busy, setBusy] = useState<VmAction | null>(null);
  const [confirm, setConfirm] = useState<VmAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPower = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${slug}/vm/power`, {
        cache: "no-store",
      });
      if (res.ok) setPower((await res.json()) as VmPower);
    } catch {
      /* ignore */
    }
  }, [slug]);

  const fetchProbe = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${slug}/health/probe`, {
        cache: "no-store",
      });
      if (res.ok) setProbe((await res.json()) as Probe);
    } catch {
      /* ignore */
    }
  }, [slug]);

  const fetchAppsAndDomains = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${slug}/apps`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const list = (await res.json()) as App[];
      setApps(list);
      const all = await Promise.all(
        list.map((a) =>
          fetch(`/api/customers/${slug}/apps/${a.id}/domains`, {
            cache: "no-store",
          })
            .then((r) => (r.ok ? (r.json() as Promise<AppDomain[]>) : []))
            .catch(() => [] as AppDomain[]),
        ),
      );
      const flat = all.flat().filter((d) => d.status !== "deleted");
      setDomains({
        total: flat.length,
        active: flat.filter((d) => d.status === "active").length,
        pending: flat.filter((d) => d.status === "pending").length,
      });
    } catch {
      /* ignore */
    }
  }, [slug]);

  useEffect(() => {
    fetchPower();
    fetchProbe();
    fetchAppsAndDomains();
    pollRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchPower();
      fetchProbe();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchPower, fetchProbe, fetchAppsAndDomains]);

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
      const want = action === "stop" ? "stopped" : "running";
      const deadline = Date.now() + ACTION_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const res2 = await fetch(`/api/customers/${slug}/vm/power`, {
          cache: "no-store",
        });
        if (res2.ok) {
          const p = (await res2.json()) as VmPower;
          setPower(p);
          if (p.state === want) break;
        }
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(null);
    }
  }

  const cpuPct = power ? Math.round(power.cpu * 100) : null;
  const memPct = power
    ? Math.round((power.mem / power.maxmem) * 100)
    : null;

  const appsRunning = apps?.filter((a) => a.status === "running").length ?? 0;
  const appsBuilding = apps?.filter((a) => a.status === "building").length ?? 0;
  const appsFailed = apps?.filter((a) => a.status === "failed").length ?? 0;

  const ht = probe ? healthTone(probe.state) : healthTone("checking");

  return (
    <div className="space-y-8">
      {/* VM operations card */}
      <section
        className="surface-card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <div
          className="flex items-center justify-between gap-4 flex-wrap"
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="type-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-4)",
              }}
            >
              § Your VM
            </span>
            {vm && (
              <>
                <span className={statusPill(power?.state ?? vm.status)}>
                  {power?.state ?? vm.status}
                </span>
                <span
                  className="type-mono"
                  style={{ fontSize: 12, color: "var(--text-3)" }}
                >
                  vm-{vm.vmid} · {vm.ip ?? "—"} · {vm.proxmox_node ?? "—"}
                </span>
              </>
            )}
          </div>
          <VmActionGroup power={power} busy={busy} onAction={setConfirm} />
        </div>

        {vm ? (
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              padding: "18px 22px",
              gap: "0 32px",
            }}
          >
            <Stat
              label="Uptime"
              value={power ? fmtUptime(power.uptime) : "—"}
            />
            <Stat
              label="CPU"
              value={
                power
                  ? `${cpuPct}% · ${power.cpus} vCPU`
                  : "—"
              }
            />
            <Stat
              label="Memory"
              value={
                power
                  ? `${fmtBytes(power.mem)} / ${fmtBytes(power.maxmem)}`
                  : "—"
              }
              sub={memPct != null ? `${memPct}% used` : undefined}
            />
            <Stat
              label="Health"
              value={
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    aria-hidden
                    className={`heartbeat-dot${probe?.state === "online" ? "" : " is-static"}`}
                    style={{ ["--hb" as string]: ht.color, width: 8, height: 8 }}
                  />
                  {ht.label}
                </span>
              }
              sub={
                probe?.latency_ms != null ? `${probe.latency_ms} ms` : undefined
              }
            />
          </div>
        ) : (
          <p
            className="type-mono"
            style={{ padding: "22px", fontSize: 12.5, color: "var(--text-3)" }}
          >
            No VM has been provisioned yet. Your WCN contact will let you know
            when it is ready.
          </p>
        )}

        {actionError && (
          <p
            className="type-mono"
            style={{
              padding: "12px 22px",
              fontSize: 12,
              color: "var(--crit)",
              borderTop: "1px solid var(--line)",
            }}
          >
            {actionError}
          </p>
        )}
      </section>

      {/* At-a-glance: apps + domains */}
      <section
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      >
        <GlanceTile
          eyebrow="Apps deployed"
          value={apps == null ? "—" : String(apps.length)}
          breakdown={
            apps == null ? null : (
              <BreakdownRow
                items={[
                  { label: "running", value: appsRunning, tone: "ok" },
                  { label: "building", value: appsBuilding, tone: "warn" },
                  { label: "failed", value: appsFailed, tone: "crit" },
                ]}
              />
            )
          }
          href="/dashboard/apps"
        />
        <GlanceTile
          eyebrow="Custom domains"
          value={domains == null ? "—" : String(domains.total)}
          breakdown={
            domains == null ? null : (
              <BreakdownRow
                items={[
                  { label: "active", value: domains.active, tone: "ok" },
                  { label: "pending", value: domains.pending, tone: "warn" },
                ]}
              />
            )
          }
          href="/dashboard/domains"
        />
      </section>

      {confirm && (
        <ConfirmDialog
          action={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runAction(confirm)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div>
      <div
        className="type-mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-4)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 500,
          color: "var(--text)",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="type-mono"
          style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function GlanceTile({
  eyebrow,
  value,
  breakdown,
  href,
}: {
  eyebrow: string;
  value: string;
  breakdown: React.ReactNode;
  href: string;
}) {
  return (
    <a
      href={href}
      className="surface-card"
      style={{
        textDecoration: "none",
        color: "inherit",
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 180ms ease, transform 180ms ease",
      }}
    >
      <div className="flex items-baseline justify-between">
        <span
          className="type-mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-4)",
          }}
        >
          § {eyebrow}
        </span>
        <span
          className="type-mono"
          style={{ fontSize: 11, color: "var(--text-3)" }}
        >
          view →
        </span>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display, var(--font-sans))",
          fontSize: 38,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}
      >
        {value}
      </div>
      {breakdown}
    </a>
  );
}

function BreakdownRow({
  items,
}: {
  items: { label: string; value: number; tone: "ok" | "warn" | "crit" }[];
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 type-mono"
      style={{ fontSize: 11.5, color: "var(--text-3)" }}
    >
      {items.map((it, i) => (
        <span
          key={it.label}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {i > 0 && (
            <span style={{ color: "var(--text-4)" }} aria-hidden>
              ·
            </span>
          )}
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: `var(--${it.tone})`,
              boxShadow: `0 0 6px color-mix(in oklch, var(--${it.tone}) 50%, transparent)`,
            }}
          />
          <span style={{ color: "var(--text)" }}>{it.value}</span>
          <span>{it.label}</span>
        </span>
      ))}
    </div>
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
      "Your VM will be unavailable for ~30 seconds while it reboots. Active sessions will drop.",
    stop:
      "Your VM will be powered off. Your site will be completely unavailable until you start it again.",
    start: "Boot the VM from its current state.",
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="modal-backdrop"
      onClick={onCancel}
    >
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span
            className="type-mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-4)",
            }}
          >
            § Confirm {action}
          </span>
        </div>
        <div className="modal-body">
          <p
            style={{
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--text-3)",
            }}
          >
            {blurbs[action]}
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            style={
              action === "stop" ? { background: "var(--crit)" } : undefined
            }
          >
            Yes, {action} VM
          </button>
        </div>
      </div>
    </div>
  );
}
