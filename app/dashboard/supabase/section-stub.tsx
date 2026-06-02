import Link from "next/link";
import { Card } from "@/components/ui/card";
import { IconExternal } from "@/components/ui/icons";

// Shared placeholder for the Supabase tabs we haven't built yet. Renders a
// friendly note + a link to the official Supabase Studio so customers can
// still get work done in the meantime.
export default function SupabaseSectionStub({
  title,
  description,
  studioPath,
  studioUrl,
}: {
  title: string;
  description: string;
  /** Path within Studio that this tab will eventually replicate, e.g. /auth/users. */
  studioPath: string;
  studioUrl: string;
}) {
  const fullStudio = `${studioUrl}${studioPath}`;
  return (
    <Card>
      <div className="px-8 py-7 space-y-3">
        <p className="type-eyebrow" style={{ color: "var(--text-3)" }}>
          § {title.toUpperCase()} — COMING SOON
        </p>
        <p className="text-[14px]" style={{ color: "var(--text-2)", lineHeight: 1.55 }}>
          {description}
        </p>
        <p className="text-[13px]" style={{ color: "var(--text-3)" }}>
          In the meantime, use the embedded Supabase Studio:
        </p>
        <Link
          href={fullStudio}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{
            display: "inline-flex",
            padding: "8px 14px",
            fontSize: 12.5,
            textDecoration: "none",
            marginTop: 6,
          }}
        >
          <IconExternal />
          Open in Studio
        </Link>
        <div
          className="type-mono"
          style={{
            fontSize: 11,
            color: "var(--text-4)",
            marginTop: 10,
            wordBreak: "break-all",
          }}
        >
          {fullStudio.replace(/^https?:\/\//, "")}
        </div>
      </div>
    </Card>
  );
}
