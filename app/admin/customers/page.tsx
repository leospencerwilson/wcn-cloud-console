import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { listCustomersWithVm } from "@/lib/db/customers";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage() {
  const customers = await listCustomersWithVm();

  return (
    <div className="space-y-14">
      <PageHeader
        eyebrow="Customers"
        title="Customers"
        subtitle="Every provisioned customer environment and its live VM status."
      />

      <Card>
        <div className="px-8 py-6">
          {customers.length === 0 ? (
            <p className="type-meta py-8">
              No customers yet. The orchestrator will populate this list once a
              deployment completes.
            </p>
          ) : (
            <CustomersTable customers={customers} />
          )}
        </div>
      </Card>
    </div>
  );
}
