import { Card } from "@/components/ui/card";
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
    <div className="max-w-2xl space-y-12">
      <header>
        <p className="type-eyebrow mb-5">§ NEW</p>
        <h1 className="type-h1 mb-3">Send an invite.</h1>
        <p
          className="text-[15px] leading-[1.55] max-w-xl"
          style={{ color: "var(--color-muted)" }}
        >
          Generates a single-use token. The recipient sets their password on
          first use.
        </p>
      </header>

      {url && (
        <Card>
          <div
            className="px-8 py-7"
            style={{ background: "rgba(161, 224, 172, 0.12)" }}
          >
            <p className="type-h2 mb-3" style={{ color: "#2F7A3C" }}>
              — INVITE CREATED
            </p>
            <p
              className="text-[14px] leading-[1.55] mb-5"
              style={{ color: "var(--color-charcoal)" }}
            >
              Copy this URL and send it to <strong>{email}</strong>. Valid for
              seven days.
            </p>
            <code
              className="block break-all type-mono px-4 py-3 border-hairline border bg-white"
              style={{ fontSize: 12 }}
            >
              {url}
            </code>
          </div>
        </Card>
      )}

      <Card>
        <div className="px-8 py-8">
          <form action={createInviteAction} className="space-y-7">
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
                className="field-select"
              >
                <option value="customer_admin">Customer Admin</option>
                <option value="wcn_admin">WCN Admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="customerSlug">
                Customer (required for Customer Admin)
              </Label>
              <select
                id="customerSlug"
                name="customerSlug"
                defaultValue=""
                className="field-select"
              >
                <option value="">— none (WCN Admin only) —</option>
                {customers.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.slug} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-4">
              <Button type="submit">Send invite</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
