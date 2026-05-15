import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCustomerAction } from "./actions";

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-archivo text-3xl font-semibold text-brand-navy">
        Create customer
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>New customer</CardTitle>
          <CardDescription>
            Creates the customer record in <code>wcn_cloud_ops</code> with
            status <strong>provisioning</strong>. VM provisioning is a separate
            script run after this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCustomerAction} className="space-y-4">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                pattern="^[a-z0-9-]{2,40}$"
                placeholder="acme"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Lowercase letters, digits, and hyphens. Forms the subdomain:
                <code className="ml-1">slug.western-communication.com</code>.
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
                className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
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
            <Button type="submit">Create customer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
