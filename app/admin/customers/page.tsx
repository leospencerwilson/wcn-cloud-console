import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listCustomersWithVm } from "@/lib/db/customers";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage() {
  const customers = await listCustomersWithVm();

  return (
    <div className="space-y-14">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="type-eyebrow mb-5">§ CUSTOMERS</p>
        </div>
        <Link href="/admin/customers/new">
          <Button>Create customer</Button>
        </Link>
      </header>

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
