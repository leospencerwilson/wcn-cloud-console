import { formatAuditAction } from "@/lib/utils";

/** Renders a raw audit action key as a legible label with a tone-coloured dot.
 * The exact key is preserved in the title tooltip. */
export function AuditAction({ action }: { action: string }) {
  const { label, tone } = formatAuditAction(action);
  const color = tone === "neutral" ? "var(--text-3)" : `var(--${tone})`;
  return (
    <span
      title={action}
      style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          flex: "none",
          background: color,
          boxShadow: `0 0 6px color-mix(in oklch, ${color} 55%, transparent)`,
        }}
      />
      <span>{label}</span>
    </span>
  );
}

export default AuditAction;
