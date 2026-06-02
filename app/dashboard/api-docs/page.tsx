import { requireCustomerAdmin } from "@/lib/auth/session";
import ApiDocsView from "./api-docs-view";

export const dynamic = "force-dynamic";

export default async function ApiDocsPage() {
  // Session check so the docs are only visible to logged-in customer users.
  // Content is all static; nothing per-customer is rendered here yet, but
  // gating the page is consistent with the rest of /dashboard/*.
  await requireCustomerAdmin();
  return (
    <div className="space-y-2">
      <header className="space-y-1">
        <p className="type-eyebrow">§ DEVELOPER</p>
        <h1 className="type-h1">API documentation</h1>
        <p
          className="text-[13.5px]"
          style={{ color: "var(--color-muted)", maxWidth: 720 }}
        >
          Full reference for the WCN Cloud customer API. Pick an endpoint on
          the left, the matching example shifts into the right-hand panel as
          you scroll. Use the language tabs in that panel to switch between
          <code className="api-doc-inline-code"> curl</code> and JavaScript.
        </p>
      </header>
      <ApiDocsView />
    </div>
  );
}
