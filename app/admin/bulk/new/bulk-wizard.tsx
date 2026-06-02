"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import type {
  BulkJobCreated,
  BulkOperation,
  BulkTargetFilter,
} from "@/lib/provisioner/types";
import { IconChevronRight, IconChevronLeft, IconPlay } from "@/components/ui/icons";

const OPS: { value: BulkOperation; label: string; description: string }[] = [
  {
    value: "vm.restart",
    label: "vm.restart",
    description: "Reboot each VM via ACPI shutdown then start.",
  },
  {
    value: "vm.stop",
    label: "vm.stop",
    description: "Graceful ACPI shutdown of each target VM.",
  },
  {
    value: "vm.start",
    label: "vm.start",
    description: "Start each stopped VM.",
  },
  {
    value: "vm.backup",
    label: "vm.backup",
    description: "Trigger a snapshot backup for each VM.",
  },
];

const TIERS = ["small", "medium", "large"];
const STATUSES = ["running", "stopped"];

type Step = 1 | 2 | 3;

function parseList(s: string): string[] {
  return s
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function BulkWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSlugs = useMemo(() => {
    const raw = searchParams?.get("slugs") ?? "";
    return parseList(raw).join(", ");
  }, [searchParams]);

  const [step, setStep] = useState<Step>(1);
  const [op, setOp] = useState<BulkOperation>("vm.restart");
  const [slugsText, setSlugsText] = useState(initialSlugs);
  const [excludeText, setExcludeText] = useState("");
  const [tiers, setTiers] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<BulkJobCreated | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filter = useMemo<BulkTargetFilter>(() => {
    const slugs = parseList(slugsText);
    const exclude = parseList(excludeText);
    return {
      slugs: slugs.length ? slugs : undefined,
      tiers: tiers.length ? tiers : undefined,
      statuses: statuses.length ? statuses : undefined,
      exclude_slugs: exclude.length ? exclude : undefined,
    };
  }, [slugsText, excludeText, tiers, statuses]);

  const filterHasAny = useMemo(
    () =>
      !!(
        filter.slugs?.length ||
        filter.tiers?.length ||
        filter.statuses?.length
      ),
    [filter],
  );

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const runDryRun = useCallback(async () => {
    setError(null);
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: op,
          target_filter: filter,
          dry_run: true,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<BulkJobCreated> & {
        error?: string;
      };
      if (!res.ok) {
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      setPreview(d as BulkJobCreated);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPreviewLoading(false);
    }
  }, [op, filter]);

  const submit = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operation: op,
          target_filter: filter,
          dry_run: false,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<BulkJobCreated> & {
        error?: string;
      };
      if (!res.ok) {
        setError(d.error || `HTTP ${res.status}`);
        return;
      }
      if (d.id) router.push(`/admin/bulk/${d.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }, [op, filter, router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 type-mono text-[11px]">
        {([1, 2, 3] as Step[]).map((n, i) => (
          <span key={n} className="flex items-center gap-2">
            <span
              style={{
                color:
                  step === n
                    ? "var(--color-ivory)"
                    : step > n
                      ? "var(--color-success, #2f6b3a)"
                      : "var(--color-muted)",
              }}
            >
              {step > n ? "✓" : n}.{" "}
              {n === 1 ? "Target" : n === 2 ? "Preview" : "Confirm"}
            </span>
            {i < 2 && <span style={{ color: "var(--color-muted)" }}>›</span>}
          </span>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <div
            className="px-6 py-3 border-b"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow">§ OPERATION & TARGETS</span>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div>
              <label className="type-eyebrow text-[10px] block mb-2">
                Operation
              </label>
              <div className="space-y-2">
                {OPS.map((o) => (
                  <label
                    key={o.value}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="op"
                      checked={op === o.value}
                      onChange={() => setOp(o.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className="type-mono text-[12px]">{o.label}</div>
                      <div
                        className="type-mono text-[11px]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {o.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="type-eyebrow text-[10px] block mb-2">
                Customer slugs (comma or whitespace-separated)
              </label>
              <textarea
                rows={2}
                value={slugsText}
                onChange={(e) => setSlugsText(e.target.value)}
                placeholder="acme, foobar"
                className="w-full type-mono text-[12px] px-3 py-2"
                style={{
                  background: "var(--color-charcoal)",
                  border: "1px solid var(--color-hairline)",
                  color: "var(--color-ivory)",
                  borderRadius: 2,
                }}
              />
              <p
                className="mt-1 type-mono text-[11px]"
                style={{ color: "var(--color-muted)" }}
              >
                Leave blank to match by tier/status only.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="type-eyebrow text-[10px] block mb-2">
                  Tiers
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIERS.map((t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 cursor-pointer type-mono text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={tiers.includes(t)}
                        onChange={() => toggle(tiers, setTiers, t)}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="type-eyebrow text-[10px] block mb-2">
                  Statuses
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 cursor-pointer type-mono text-[12px]"
                    >
                      <input
                        type="checkbox"
                        checked={statuses.includes(s)}
                        onChange={() => toggle(statuses, setStatuses, s)}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="type-eyebrow text-[10px] block mb-2">
                Exclude slugs
              </label>
              <textarea
                rows={2}
                value={excludeText}
                onChange={(e) => setExcludeText(e.target.value)}
                placeholder="never-touch"
                className="w-full type-mono text-[12px] px-3 py-2"
                style={{
                  background: "var(--color-charcoal)",
                  border: "1px solid var(--color-hairline)",
                  color: "var(--color-ivory)",
                  borderRadius: 2,
                }}
              />
            </div>

            {error && (
              <p
                className="type-mono text-[12px]"
                style={{ color: "var(--color-danger, #b03020)" }}
              >
                {error}
              </p>
            )}
          </div>
          <div
            className="px-6 py-3 border-t flex items-center justify-end gap-2"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!filterHasAny || previewLoading}
              onClick={runDryRun}
            >
              <IconChevronRight />
              {previewLoading ? "Resolving…" : "Preview targets"}
            </button>
          </div>
        </Card>
      )}

      {step === 2 && preview && (
        <Card>
          <div
            className="px-6 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow">§ DRY RUN · #{preview.id}</span>
            <span
              className="type-mono text-[11px]"
              style={{ color: "var(--color-muted)" }}
            >
              {op}
            </span>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-baseline gap-3">
              <span
                className="type-mono"
                style={{ fontSize: 28, color: "var(--color-ivory)" }}
              >
                {preview.target_count}
              </span>
              <span
                className="type-mono text-[12px]"
                style={{ color: "var(--color-muted)" }}
              >
                VM{preview.target_count === 1 ? "" : "s"} matched
              </span>
            </div>
            {preview.targets?.length > 0 && (
              <div>
                <span className="type-eyebrow text-[10px] block mb-2">
                  Targets
                </span>
                <div
                  className="type-mono text-[12px] max-h-64 overflow-y-auto px-3 py-2"
                  style={{
                    background: "var(--color-charcoal)",
                    border: "1px solid var(--color-hairline)",
                    borderRadius: 2,
                  }}
                >
                  {preview.targets.map((s) => (
                    <div key={s}>{s}</div>
                  ))}
                </div>
              </div>
            )}
            {preview.target_count === 0 && (
              <p
                className="type-mono text-[12px]"
                style={{ color: "var(--color-warning, #b07020)" }}
              >
                Filter matched no VMs. Go back and adjust.
              </p>
            )}
          </div>
          <div
            className="px-6 py-3 border-t flex items-center justify-between"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setPreview(null);
                setStep(1);
              }}
            >
              <IconChevronLeft />
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={preview.target_count === 0}
              onClick={() => setStep(3)}
            >
              <IconChevronRight />
              Continue
            </button>
          </div>
        </Card>
      )}

      {step === 3 && preview && (
        <Card>
          <div
            className="px-6 py-3 border-b"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <span className="type-eyebrow">§ CONFIRM</span>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="type-mono text-[12px]">
              About to run{" "}
              <span style={{ color: "var(--color-warning, #b07020)" }}>
                {op}
              </span>{" "}
              on{" "}
              <span style={{ color: "var(--color-ivory)" }}>
                {preview.target_count}
              </span>{" "}
              VM{preview.target_count === 1 ? "" : "s"}. Concurrency cap 5.
            </p>
            <p
              className="type-mono text-[11px]"
              style={{ color: "var(--color-muted)" }}
            >
              Type{" "}
              <span style={{ color: "var(--color-ivory)" }}>RUN</span> to
              confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RUN"
              className="w-full type-mono text-[12px] px-3 py-2"
              style={{
                background: "var(--color-charcoal)",
                border: "1px solid var(--color-hairline)",
                color: "var(--color-ivory)",
                borderRadius: 2,
              }}
            />
            {error && (
              <p
                className="type-mono text-[12px]"
                style={{ color: "var(--color-danger, #b03020)" }}
              >
                {error}
              </p>
            )}
          </div>
          <div
            className="px-6 py-3 border-t flex items-center justify-between"
            style={{ borderColor: "var(--color-hairline)" }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setStep(2)}
            >
              <IconChevronLeft />
              Back
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={confirmText !== "RUN" || submitting}
              onClick={submit}
            >
              <IconPlay />
              {submitting ? "Submitting…" : `Run on ${preview.target_count} VMs`}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
