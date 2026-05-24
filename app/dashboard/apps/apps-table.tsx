"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { statusPill } from "@/lib/utils";
import type { App } from "@/lib/provisioner/types";

function fmtSource(a: App): string {
  if (a.source_type === "git") {
    return `${a.source_repo ?? "—"} (${a.source_branch || "main"})`;
  }
  if (a.source_type === "dockerimage") return a.docker_image ?? "—";
  return a.source_repo ?? "—";
}

export default function AppsTable({
  slug,
  apps: initial,
}: {
  slug: string;
  apps: App[];
}) {
  const router = useRouter();
  const [apps, setApps] = useState<App[]>(initial);
  const [target, setTarget] = useState<App | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDelete(a: App) {
    setTarget(a);
    setConfirmName("");
    setError(null);
  }

  function closeDelete() {
    if (deleting) return;
    setTarget(null);
    setConfirmName("");
    setError(null);
  }

  async function confirmDelete() {
    if (!target || confirmName !== target.name) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${slug}/apps/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error || `Delete failed (${res.status})`);
        setDeleting(false);
        return;
      }
      setApps((prev) => prev.filter((a) => a.id !== target.id));
      setTarget(null);
      setConfirmName("");
      setDeleting(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setDeleting(false);
    }
  }

  return (
    <>
      <section
        className="surface-card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <table className="w-full text-[14px]">
          <thead>
            <tr style={{ color: "var(--text-3)" }}>
              <th className="text-left px-6 py-3 type-eyebrow">Name</th>
              <th className="text-left px-6 py-3 type-eyebrow">Source</th>
              <th className="text-left px-6 py-3 type-eyebrow">Status</th>
              <th className="text-left px-6 py-3 type-eyebrow">Last deploy</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr
                key={a.id}
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/apps/${a.id}`}
                    style={{ color: "var(--text)", fontWeight: 500 }}
                  >
                    {a.name}
                  </Link>
                </td>
                <td
                  className="px-6 py-4 type-mono text-[12px]"
                  style={{ color: "var(--text-3)" }}
                >
                  {fmtSource(a)}
                </td>
                <td className="px-6 py-4">
                  <span className={statusPill(a.status)}>{a.status}</span>
                </td>
                <td
                  className="px-6 py-4 type-mono text-[12px]"
                  style={{ color: "var(--text-3)" }}
                >
                  {a.last_deploy_at
                    ? new Date(a.last_deploy_at).toLocaleString()
                    : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--crit)" }}
                    onClick={() => openDelete(a)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {target && (
        <div className="modal-backdrop" onClick={closeDelete}>
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460 }}
          >
            <header className="modal-header">
              <span className="type-eyebrow" style={{ color: "var(--crit)" }}>
                § Delete application
              </span>
            </header>
            <div className="modal-body" style={{ display: "grid", gap: 14 }}>
              <p style={{ fontSize: 13.5, color: "var(--text-2)" }}>
                This permanently deletes{" "}
                <span className="type-mono" style={{ color: "var(--text)" }}>
                  {target.name}
                </span>{" "}
                along with its Coolify resource, env vars, domains, and deploy
                history. This cannot be undone.
              </p>
              <label
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--text-3)",
                }}
              >
                Type{" "}
                <span className="type-mono" style={{ color: "var(--text-2)" }}>
                  {target.name}
                </span>{" "}
                to confirm:
                <input
                  type="text"
                  className="field-input"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={target.name}
                  autoFocus
                />
              </label>
              {error && (
                <p
                  className="type-mono"
                  style={{ fontSize: 12, color: "var(--crit)" }}
                >
                  {error}
                </p>
              )}
            </div>
            <footer
              className="modal-footer"
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={confirmDelete}
                disabled={deleting || confirmName !== target.name}
                style={{
                  background: "var(--crit)",
                  borderColor: "var(--crit)",
                  color: "white",
                }}
              >
                {deleting ? "Deleting…" : "Delete app"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
