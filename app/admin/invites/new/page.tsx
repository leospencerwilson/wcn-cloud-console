import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listCustomers } from "@/lib/db/customers";
import { createInviteAction } from "./actions";

interface PageProps {
  searchParams: Promise<{ url?: string; email?: string }>;
}

export default async function NewInvitePage({ searchParams }: PageProps) {
  const { url, email } = await searchParams;
  const customers = await listCustomers();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-archivo text-3xl font-semibold text-brand-navy">
        New invite
      </h1>

      {url && (
        <Card className="border-brand-mint bg-brand-mint/10">
          <CardHeader>
            <CardTitle>Invite created</CardTitle>
            <CardDescription>
              Copy this URL and send it to <strong>{email}</strong>. It is valid
              for 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block break-all bg-white border border-neutral-200 rounded px-3 py-2 text-xs font-space-grotesk">
              {url}
            </code>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Issue invite</CardTitle>
          <CardDescription>
            Generates a single-use invite token. The recipient sets a password
            on first use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createInviteAction} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                required
                defaultValue="customer_admin"
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                <option value="customer_admin">customer_admin</option>
                <option value="wcn_admin">wcn_admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="customerSlug">
                Customer (required for customer_admin)
              </Label>
              <select
                id="customerSlug"
                name="customerSlug"
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">— none (wcn_admin only) —</option>
                {customers.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.slug} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Create invite</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
