import { Card } from "@/components/ui/card";
import { requireWcnAdmin } from "@/lib/auth/session";
import NewTierForm from "./new-tier-form";

export default async function NewTierPage() {
  await requireWcnAdmin();
  return (
    <div className="max-w-2xl space-y-12">
      <header>
        <p className="type-eyebrow mb-5">§ NEW TIER</p>
        <h1 className="type-h1 mb-3">Define a customer tier.</h1>
        <p
          className="text-[15px] leading-[1.55] max-w-xl"
          style={{ color: "var(--color-muted)" }}
        >
          Tiers describe the resources and price for a customer plan. Once
          created the slug cannot be changed.
        </p>
      </header>

      <Card>
        <div className="px-8 py-8">
          <NewTierForm />
        </div>
      </Card>
    </div>
  );
}
