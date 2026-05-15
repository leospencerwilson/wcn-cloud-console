import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCustomerAction } from "./actions";

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
          Records a customer in the ops database — actual VM provisioning is
          handled by the orchestrator script.
        </p>
      </header>

      <Card>
        <div className="px-8 py-8">
          <form action={createCustomerAction} className="space-y-7">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                pattern="^[a-z0-9-]{2,40}$"
                placeholder="acme"
              />
              <p
                className="text-[12px] mt-3 leading-[1.5]"
                style={{ color: "var(--color-muted)" }}
              >
                Lowercase letters, digits and hyphens. Forms the subdomain{" "}
                <code className="type-mono">slug.western-communication.com</code>.
              </p>
            </div>
            <div>
              <Label htmlFor="name">Display name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="tier">Tier</Label>
              <select
                id="tier"
                name="tier"
                required
                className="field-select"
                defaultValue="site"
              >
                <option value="site">site</option>
                <option value="site-db">site-db</option>
                <option value="pro">pro</option>
              </select>
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
              />
            </div>
            <div className="pt-4">
              <Button type="submit">Create customer</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
