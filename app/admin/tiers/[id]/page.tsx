import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireWcnAdmin } from "@/lib/auth/session";
import { countCustomersOnTier, getTier } from "@/lib/db/tiers";
import EditTierForm from "./edit-tier-form";
import { archiveTierAction } from "./actions";
import { IconChevronLeft, IconTrash } from "@/components/ui/icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTierPage({ params }: PageProps) {
  await requireWcnAdmin();
  const { id } = await params;
  const tier = await getTier(id);
  if (!tier) notFound();

  const customerCount = await countCustomersOnTier(id);
  const archiveDisabled = tier.archived || customerCount > 0;
  const archiveTooltip = tier.archived
    ? "Tier is already archived"
    : customerCount > 0
      ? `${customerCount} customer${customerCount === 1 ? "" : "s"} still on this tier`
      : undefined;

  return (
    <div className="max-w-2xl space-y-12">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="type-eyebrow mb-5">§ EDIT TIER</p>
          <h1 className="type-h1 mb-3">
            <span className="type-mono">{tier.id}</span>
          </h1>
          <p
            className="text-[15px] leading-[1.55] max-w-xl"
            style={{ color: "var(--color-muted)" }}
          >
            {customerCount} customer{customerCount === 1 ? "" : "s"} on this tier.
          </p>
        </div>
        <Link href="/admin/tiers">
          <Button variant="secondary"><IconChevronLeft />Back</Button>
        </Link>
      </header>

      <Card>
        <div className="px-8 py-8">
          <EditTierForm tier={tier} />
        </div>
      </Card>

      <Card>
        <div className="px-8 py-8 space-y-5">
          <div>
            <p className="type-eyebrow mb-3">§ ARCHIVE</p>
            <p
              className="text-[14px] leading-[1.55] max-w-xl"
              style={{ color: "var(--color-muted)" }}
            >
              Archived tiers are hidden from selectors but preserved for
              historical reference. Soft-delete only — never hard-removed.
            </p>
          </div>
          <form action={archiveTierAction}>
            <input type="hidden" name="id" value={tier.id} />
            <Button
              type="submit"
              variant="danger"
              disabled={archiveDisabled}
              title={archiveTooltip}
            >
              <IconTrash />
              {tier.archived ? "Archived" : "Archive tier"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
