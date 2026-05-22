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
