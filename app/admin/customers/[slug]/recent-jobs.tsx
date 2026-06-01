import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function RecentJobs({
  slug,
  lastJobId,
}: {
  slug: string;
  lastJobId: string;
}) {
  const short = lastJobId.slice(0, 8);
  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="type-h2">— ADMIN</h2>
        <span className="type-meta">Provisioner jobs</span>
      </div>
      <Card>
        <div className="px-8 py-2">
          <ul>
            <li
              className="border-b-hairline border-b last:border-b-0"
              style={{ borderColor: "var(--color-hairline)" }}
            >
              <Link
                href={`/admin/customers/${slug}/jobs/${lastJobId}`}
                className="flex items-center justify-between py-5 group"
              >
                <div>
                  <div
                    className="font-medium text-[15px] type-mono"
                    style={{ color: "var(--color-navy)" }}
                  >
                    {short}
                  </div>
                  <div className="type-meta mt-1">
                    Streamed logs from the most recent run
                  </div>
                </div>
                <span
                  className="type-mono text-[12px]"
                  style={{ color: "var(--color-muted)" }}
                >
                  →
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </Card>
    </section>
  );
}
