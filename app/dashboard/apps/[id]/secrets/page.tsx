import { redirect } from "next/navigation";

// Secrets are merged into the Environment view. Redirect any direct
// /secrets navigations to /env so old bookmarks keep working.
export default async function SecretsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/apps/${id}/env`);
}
