export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="type-h3">Environment variables</h3>
          <p
            className="type-mono"
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              marginTop: 6,
            }}
          >
            Loading…
          </p>
        </div>
      </div>
      <section
        className="surface-card"
        style={{ padding: 0, overflow: "hidden" }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "28% 1fr 220px 90px",
              gap: 16,
              padding: "14px 16px",
              borderTop: i === 0 ? "0" : "1px solid var(--line)",
            }}
          >
            <SkeletonBar w="70%" />
            <SkeletonBar w="92%" />
            <SkeletonBar w="80%" />
            <SkeletonBar w="40%" />
          </div>
        ))}
      </section>
    </div>
  );
}

function SkeletonBar({ w }: { w: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        height: 12,
        width: w,
        borderRadius: 4,
        background:
          "linear-gradient(90deg, color-mix(in oklch, var(--text-4) 14%, transparent), color-mix(in oklch, var(--text-4) 26%, transparent), color-mix(in oklch, var(--text-4) 14%, transparent))",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}
