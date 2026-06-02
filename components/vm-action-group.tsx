import type { VmAction, VmPower } from "@/lib/provisioner/vms-client";

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

function StartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 5v14l12-7L7 5z" />
    </svg>
  );
}

/**
 * Shared grouped VM power controls (Restart · Stop · Start) with icons.
 * Used by the customer overview and the admin customer views so they look
 * identical. `onAction` is called with the requested action — the caller is
 * responsible for confirmation / running it.
 */
export function VmActionGroup({
  power,
  busy,
  onAction,
}: {
  power: VmPower | null;
  busy: VmAction | null;
  onAction: (action: VmAction) => void;
}) {
  return (
    <div className="vm-action-group" role="group" aria-label="VM power">
      <button
        type="button"
        className="vm-action vm-action--restart"
        disabled={!power || busy !== null || power.state !== "running"}
        onClick={() => onAction("restart")}
        title="Restart VM"
      >
        <RestartIcon />
        <span>{busy === "restart" ? "Restarting…" : "Restart"}</span>
      </button>
      <button
        type="button"
        className="vm-action vm-action--stop"
        disabled={!power || busy !== null || power.state === "stopped"}
        onClick={() => onAction("stop")}
        title="Stop VM"
      >
        <StopIcon />
        <span>{busy === "stop" ? "Stopping…" : "Stop"}</span>
      </button>
      <button
        type="button"
        className="vm-action vm-action--start"
        disabled={!power || busy !== null || power.state === "running"}
        onClick={() => onAction("start")}
        title="Start VM"
      >
        <StartIcon />
        <span>{busy === "start" ? "Starting…" : "Start"}</span>
      </button>
    </div>
  );
}

export default VmActionGroup;
