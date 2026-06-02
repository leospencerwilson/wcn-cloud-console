import { IconLogIn } from "@/components/ui/icons";

export default function SignoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        style={{ padding: "4px 8px", height: 26 }}
        title="Sign out"
      >
        <IconLogIn />
      </button>
    </form>
  );
}
