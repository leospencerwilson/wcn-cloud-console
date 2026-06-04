export type AppStatus =
  | "pending"
  | "building"
  | "running"
  | "failed"
  | "stopped"
  | "deleted";

export type App = {
  id: string;
  customer_slug: string;
  name: string;
  coolify_app_uuid: string | null;
  source_type: "git" | "dockerfile" | "dockerimage";
  source_repo: string | null;
  source_branch: string;
  docker_image: string | null;
  build_pack: "nixpacks" | "static" | "dockerfile" | "dockercompose";
  status: AppStatus;
  last_deploy_at: string | null;
  last_deploy_status: string | null;
  created_at: string;
  updated_at: string;
};

export type AppCreateInput = {
  name: string;
  source_type: App["source_type"];
  source_repo?: string;
  source_branch?: string;
  docker_image?: string;
  build_pack?: App["build_pack"];
};

export type EnvVar = {
  key: string;
  value: string;
  is_build_time: boolean;
  is_preview: boolean;
};

export type AppDomain = {
  hostname: string;
  status: "pending" | "active" | "failed" | "deleted";
  cf_custom_hostname_id: string;
  cf_status?: string;
  cf_ssl_status?: string;
  ssl_status: "pending_validation" | "active" | "failed";
  cname_target: string;
  instructions?: string;
  verification_errors?: string[];
  activated_at: string | null;
  // Present when the domain's CNAME was auto-created at the customer's
  // connected DNS provider. Set on the add() response AND on subsequent
  // list rows so the UI can hide manual-config instructions and show a
  // "auto via {provider}" pill.
  auto_configured?: {
    provider: "cloudflare" | "route53" | "google" | "vercel" | "digitalocean";
    zone: string;
    record_id: string;
    display_name?: string;
  } | null;
};

export type RedirectRule = {
  id: number;
  from_host: string;
  from_path: string;
  to_url: string;
  status_code: 301 | 302;
  enabled: boolean;
  created_at: string;
};

export type RedirectRuleInput = {
  from_host: string;
  from_path?: string;
  to_url: string;
  status_code?: 301 | 302;
};

export type Secret = {
  key: string;
  created_at: string;
  last_rotated_at: string | null;
};

export type SecretInput = {
  key: string;
  value: string;
};

export type AuditEvent = {
  id: number;
  ts: string;
  actor: string;
  action: string;
  slug: string;
  details: Record<string, unknown> | null;
};

export type DeployStatus = {
  deployment_uuid: string;
  status: "queued" | "in_progress" | "success" | "failed" | "cancelled";
  started_at: string | null;
  finished_at: string | null;
  log_tail?: string;
};

export type CronTask = {
  task_uuid: string;
  name: string;
  command: string;
  frequency: string;
  container: string | null;
  enabled: boolean;
  last_run_at: string | null;
  last_run_status: "success" | "failed" | null;
};

export type CronTaskInput = {
  name: string;
  command: string;
  frequency: string;
  container?: string;
};

export type ProvisionerError = {
  error: string;
  code: string;
};

export type MetricsWindow = "1h" | "24h" | "7d" | "30d";

export type MetricPoint = { ts: number; value: number };

export type MetricsResponse = {
  slug: string;
  window: MetricsWindow;
  step: string;
  series: Record<string, MetricPoint[]>;
};

export type AppMetricsResponse = MetricsResponse & {
  app_id: string;
  container: string | null;
};

export type PublicServiceStatus =
  | "operational"
  | "degraded"
  | "stopped"
  | "down"
  | "unknown";

export type PublicOverallStatus = "operational" | "degraded" | "down";

export type PublicIncident = {
  id: string;
  started_at: string;
  resolved_at: string | null;
  severity: "minor" | "major" | "critical";
  summary: string;
};

export type DomainCertMetadata = {
  hostname: string;
  uploaded: boolean;
  not_before?: string;
  not_after?: string;
  fingerprint_sha256?: string;
  has_chain?: boolean;
  uploaded_at?: string;
  subject?: string;
};

export type DomainCertInput = {
  cert_pem: string;
  key_pem: string;
  chain_pem?: string;
};

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertRuleState = "inactive" | "pending" | "firing";

export type AlertRule = {
  name: string;
  state: AlertRuleState;
  health: string;
  severity: AlertSeverity;
  duration_s: number;
  query: string;
  summary: string;
  firing_count: number;
};

export type AlertFiringStatus = "firing" | "resolved";

export type AlertFiring = {
  id: number;
  fingerprint: string;
  alertname: string;
  severity: AlertSeverity;
  slug: string | null;
  summary: string;
  status: AlertFiringStatus;
  started_at: string;
  resolved_at: string | null;
  received_at: string;
};

export type CapacityProjectionTier = {
  fits: number;
  limited_by: "cpu" | "memory" | "disk" | null;
};

export type CapacityStorage = {
  name: string;
  type: string;
  used_bytes: number;
  total_bytes: number;
  avail_bytes: number;
};

export type CapacityNode = {
  node: string;
  status: "online" | "offline" | "unknown";
  cpu_used_frac: number;
  cpu_cores: number;
  mem_used_bytes: number;
  mem_total_bytes: number;
  uptime_seconds: number;
  storage: CapacityStorage[];
  running_vms: number;
  stopped_vms: number;
  projection: {
    small: CapacityProjectionTier;
    medium: CapacityProjectionTier;
    large: CapacityProjectionTier;
  };
  pressure: { memory: number; cpu: number; disk: number };
};

export type CapacityTierShape = {
  cores: number;
  memory_mb: number;
  disk_gb: number;
};

export type CapacityCustomerCount = {
  tier: "small" | "medium" | "large";
  count: number;
};

export type CapacityReport = {
  nodes: CapacityNode[];
  aggregate: {
    total_running: number;
    total_stopped: number;
    total_capacity_fits: { small: number; medium: number; large: number };
  };
  customer_counts: CapacityCustomerCount[];
  tier_shapes: {
    small: CapacityTierShape;
    medium: CapacityTierShape;
    large: CapacityTierShape;
  };
  checked_at: string;
};

export type TeamRole = "owner" | "admin" | "developer" | "viewer";

export type TeamMember = {
  id: number;
  user_email: string;
  role: TeamRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  pending_invite: boolean;
  // "primary" = founding admin from app_users (no invite). Cannot be
  // role-changed or revoked from this UI — synthesized row.
  source?: "team" | "primary";
};

export type TeamInviteCreated = {
  id: number;
  user_email: string;
  role: TeamRole;
  invite_token: string;
  invite_expires_at: string;
};

export type ApiTokenScope = string;

export type ApiToken = {
  id: number;
  user_email: string;
  name: string;
  prefix: string;
  scopes: ApiTokenScope[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

export type ApiTokenCreated = ApiToken & {
  token: string;
  message: string;
};

export type ApiTokenValidate = {
  customer_slug: string;
  user_email: string;
  scopes: ApiTokenScope[];
  token_id: number;
};

export type BulkOperation = "vm.restart" | "vm.stop" | "vm.start" | "vm.backup";

export type BulkRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped";

export type BulkJobStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "partial"
  | "failed"
  | "aborted";

export type BulkTargetFilter = {
  slugs?: string[];
  tiers?: string[];
  statuses?: string[];
  exclude_slugs?: string[];
};

export type BulkRun = {
  slug: string;
  status: BulkRunStatus;
  started_at: string | null;
  finished_at: string | null;
  result?: unknown;
  error?: string | null;
};

export type BulkJob = {
  id: number;
  actor: string;
  operation: BulkOperation;
  args: Record<string, unknown>;
  target_filter: BulkTargetFilter;
  dry_run: boolean;
  status: BulkJobStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  abort_requested: boolean;
  target_count?: number;
  targets?: string[];
  runs: BulkRun[];
};

export type BulkJobCreated = {
  id: number;
  status: BulkJobStatus;
  operation: BulkOperation;
  dry_run: boolean;
  target_count: number;
  targets: string[];
};

// === DB GUI (#17) ===

export type DbTable = {
  schema: string;
  name: string;
  size_bytes: number;
  estimated_rows: number;
};

export type DbColumn = {
  name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  ordinal_position: number;
};

export type DbSizes = {
  db_size_bytes: number;
  tables: { schema: string; name: string; size_bytes: number }[];
};

export type DbQueryRow = Record<string, unknown>;

export type DbSelectResult = {
  statement_type: string;
  rows: DbQueryRow[];
  columns: string[];
  row_count: number;
  truncated: boolean;
  duration_ms: number;
};

export type DbMutationResult = {
  statement_type: string;
  affected_rows: number;
  output: string;
  duration_ms: number;
};

export type DbQueryResult = DbSelectResult | DbMutationResult;

export type DbQueryError = {
  error: string;
  code: string;
  duration_ms?: number;
};

// === Push-to-deploy webhooks (#21) ===

export type AppWebhookCreated = {
  webhook_id: string;
  secret: string;
  branch: string;
  enabled: boolean;
  instructions: string;
  message: string;
};

export type AppWebhookConfig =
  | { configured: false }
  | {
      configured: true;
      webhook_id: string;
      webhook_url: string;
      branch: string;
      enabled: boolean;
      last_delivery_at: string | null;
    };

export type AppWebhookPatch = {
  branch?: string;
  enabled?: boolean;
};

export type AppWebhookLookup = {
  app_id: string;
  customer_slug: string;
  coolify_app_uuid: string;
  secret: string;
  branch: string;
};

export type SupabaseConnection = {
  studio_url: string;
  rest_url: string;
  realtime_url: string;
  storage_url: string;
  auth_url: string;
  connection_strings: {
    direct_external: string;
    pooler_session: string;
    pooler_transaction: string;
    direct_internal: string;
  };
  password_known: boolean;
  note: string | null;
};

export type CoolifyWebhookOverview = {
  app_id: string;
  app_name: string;
  app_status: string;
  webhook:
    | { configured: false }
    | {
        configured: true;
        webhook_id: string;
        webhook_url: string;
        branch: string;
        enabled: boolean;
        last_delivery_at: string | null;
      };
};

export type CoolifyEnvVar = {
  key: string;
  is_build_time: boolean;
  is_preview: boolean;
};

export type CoolifyEnvOverview = {
  app_id: string;
  app_name: string;
  env_vars: CoolifyEnvVar[];
};

export type CoolifyCronTask = {
  uuid: string;
  name: string;
  command: string;
  frequency: string;
  container: string | null;
};

export type CoolifyCronOverview = {
  app_id: string;
  app_name: string;
  tasks: CoolifyCronTask[];
  error: string | null;
};

export type PublicStatus = {
  customer: { name: string; slug: string };
  overall: PublicOverallStatus;
  services: { name: string; status: PublicServiceStatus }[];
  uptime: {
    h24: number | null;
    d30: number | null;
    d90: number | null;
  };
  incidents: PublicIncident[];
  checked_at: string;
};
