"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite } from "./actions";

interface Props {
  token: string;
  email: string;
}

export default function AcceptForm({ token, email }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await acceptInvite({ token, password, name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <Label>Email</Label>
        <Input value={email} disabled readOnly />
      </div>
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p
          className="text-[12px] mt-3"
          style={{ color: "var(--color-muted)" }}
        >
          Minimum twelve characters.
        </p>
      </div>
      {error && (
        <p
          className="text-[13px] font-medium"
          role="alert"
          style={{ color: "#B91C1C" }}
        >
          {error}
        </p>
      )}
      <div className="pt-2">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Setting up…" : "Set password"}
        </Button>
      </div>
    </form>
  );
}
