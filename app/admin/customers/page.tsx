import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listCustomers } from "@/lib/db/customers";

export default async function CustomersPage() {
  const customers = await listCustomers();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-archivo text-3xl font-semibold text-brand-navy">
          Customers
        </h1>
        <Link href="/admin/customers/new">
          <Button>Create customer</Button>
        </Link>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500 bg-neutral-50">
              <tr>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-neutral-500"
                  >
                    No customers yet. Click "Create customer" to add one.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.slug} className="border-t border-neutral-100">
                    <td className="py-3 px-4 font-space-grotesk">{c.slug}</td>
                    <td className="py-3 px-4">{c.name}</td>
                    <td className="py-3 px-4">{c.tier}</td>
                    <td className="py-3 px-4">{c.status}</td>
                    <td className="py-3 px-4">{c.contact_email}</td>
                    <td className="py-3 px-4 font-space-grotesk text-xs text-neutral-600">
                      {new Date(c.created_at).toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
