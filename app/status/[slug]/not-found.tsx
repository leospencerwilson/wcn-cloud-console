export default function StatusNotFound() {
  return (
    <div
      className="min-h-screen flex flex-col"
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
      <main className="mx-auto max-w-3xl px-6 py-24 flex-1">
        <p className="type-eyebrow mb-3">§ NOT FOUND</p>
        <h1 className="type-h1 mb-4">No status page here</h1>
        <p
          className="text-[15px] leading-[1.55]"
          style={{ color: "var(--color-muted)" }}
        >
          The customer you&apos;re looking for doesn&apos;t exist or hasn&apos;t
          opted into a public status page.
        </p>
      </main>
    </div>
  );
}
