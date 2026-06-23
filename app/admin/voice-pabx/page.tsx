import { requireWcnAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import MetricsDashboard from "@/components/metrics-dashboard";
import VoipSummary from "@/components/voip-summary";

export const dynamic = "force-dynamic";

const HOSTS = [
  { key: "sbc", label: "SBC — Kamailio + rtpengine", addr: "10.10.30.22" },
  { key: "edge", label: "Edge — Kamailio + FreeSWITCH", addr: "10.10.30.21" },
  { key: "core", label: "Core — Kazoo + CouchDB + RabbitMQ", addr: "10.10.30.20" },
];

export default async function VoicePabxMonitoringPage() {
  await requireWcnAdmin();
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Voice & PABX"
        title="Monitoring & Alerting"
        subtitle="Live health of the VoIP platform — SBC, edge and core nodes."
        actions={<span className="type-meta">FreeSWITCH + Kazoo + node_exporter via Prometheus</span>}
      />
      <VoipSummary />
      {HOSTS.map((h) => (
        <div key={h.key}>
          <div className="mb-3.5 flex items-baseline justify-between gap-6 flex-wrap">
            <h3 className="type-h3">{h.label}</h3>
            <span className="type-meta">{h.addr}</span>
          </div>
          <MetricsDashboard
            endpoint={`/api/admin/voice/metrics/${h.key}`}
            allSeries={["cpu", "ram", "disk", "net"]}
            defaultSeries={["cpu", "ram", "disk", "net"]}
          />
        </div>
      ))}
    </div>
  );
}
