export default function Loading() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-ivory)", color: "var(--color-charcoal)" }}
    >
      <div
        aria-hidden
        style={{ height: 2, width: "100%", background: "var(--color-navy)" }}
      />
      <header
        className="border-b-hairline border-b"
        style={{
          background: "var(--color-ivory)",
          borderColor: "var(--color-hairline)",
        }}
      >
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center">
          <span
            className="font-display italic font-semibold text-[18px] tracking-[-0.02em]"
            style={{ color: "var(--color-navy)" }}
          >
            WCN
          </span>
          <span
            aria-hidden
            className="mx-4 h-5 w-px"
            style={{ background: "var(--color-hairline)" }}
          />
          <span className="type-eyebrow">§ STATUS</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-14">
        <Skeleton h={28} w="40%" />
        <div
          className="px-8 py-10 text-center"
          style={{
            border: "1px solid var(--color-hairline)",
            background: "white",
            borderRadius: 2,
          }}
        >
          <Skeleton h={36} w="60%" center />
        </div>
        <Skeleton h={18} w="20%" />
        <div
          className="space-y-px"
          style={{
            border: "1px solid var(--color-hairline)",
            borderRadius: 2,
            background: "var(--color-hairline)",
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="px-6 py-5 flex justify-between"
              style={{ background: "white" }}
            >
              <Skeleton h={14} w="30%" />
              <Skeleton h={14} w="20%" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Skeleton({
  h,
  w,
  center,
}: {
  h: number;
  w: string;
  center?: boolean;
}) {
  return (
    <div
      style={{
        height: h,
        width: w,
        background: "var(--color-hairline)",
        borderRadius: 2,
        opacity: 0.5,
        marginLeft: center ? "auto" : undefined,
        marginRight: center ? "auto" : undefined,
      }}
    />
  );
}
