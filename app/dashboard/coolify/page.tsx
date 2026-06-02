import { redirect } from "next/navigation";

// The Coolify tab has been removed from the customer dashboard.
// Redirect any old bookmarks back to the dashboard root.
export default async function CoolifyPage() {
  redirect("/dashboard");
}
