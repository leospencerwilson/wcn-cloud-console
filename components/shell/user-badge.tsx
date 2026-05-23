export default function UserBadge({ email }: { email: string }) {
  const initial = (email || "?").charAt(0).toUpperCase();
  return (
    <div className="user-badge" title={email}>
      <span className="user-badge__avatar">{initial}</span>
      <span className="type-mono" style={{ letterSpacing: "-0.005em" }}>
        {email}
      </span>
      <form action="/api/auth/logout" method="post" style={{ marginLeft: 4 }}>
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          style={{
            border: "1px solid var(--line)",
            background: "transparent",
            color: "var(--text-3)",
            borderRadius: 999,
            width: 22,
            height: 22,
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ⏻
        </button>
      </form>
    </div>
  );
}
