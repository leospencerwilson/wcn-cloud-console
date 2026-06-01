import { Card } from "@/components/ui/card";
import NewCustomerForm from "./new-customer-form";

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl space-y-12">
      <header>
        <p className="type-eyebrow mb-5">§ NEW</p>
        <h1 className="type-h1 mb-3">Provision a customer.</h1>
        <p
          className="text-[15px] leading-[1.55] max-w-xl"
          style={{ color: "var(--color-muted)" }}
        >
          Creates the customer record and kicks off VM provisioning. Watch the
          job log on the next page for live output.
        </p>
      </header>

      <Card>
        <div className="px-8 py-8">
          <NewCustomerForm />
        </div>
      </Card>
    </div>
  );
}
