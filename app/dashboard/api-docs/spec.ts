// API documentation spec for the WCN Cloud customer API.
//
// Adding a new endpoint? Append to the relevant Section's `endpoints` array
// (or add a new Section). The renderer in `api-docs-view.tsx` builds the
// nav, prose, and code-panel content from this single source of truth.

export type Method = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

export type Param = {
  name: string;
  type: string;
  in: "path" | "query" | "body" | "header";
  required?: boolean;
  description: string;
};

export type Examples = {
  curl: string;
  js: string;
  /** Pretty-printed JSON shown under the request as the response example. */
  response?: string;
};

export type Endpoint = {
  id: string;
  method: Method;
  /** Path with `{param}` placeholders, e.g. `/apps/{id}`. Base URL is implied. */
  path: string;
  title: string;
  description: string;
  scope?: string;
  params?: Param[];
  examples: Examples;
  /** When true, renders an empty stub instead of full content (placeholder). */
  stub?: boolean;
};

export type Section = {
  id: string;
  title: string;
  intro?: string;
  endpoints?: Endpoint[];
};

// `{slug}` in path examples is a literal placeholder the user replaces with
// their own customer slug. The runtime example calls use the literal string
// `your-slug` so people can see-and-replace.
const SLUG = "your-slug";
const BASE = "https://console.western-communication.com/api/customers";
const TOKEN = "wcn_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

/* ─────────────────────────────────────────────────────────────────────
 * Small builders to keep example consistency across endpoints.
 * ─────────────────────────────────────────────────────────────────── */

function curlGet(path: string, qs?: Record<string, string>): string {
  const q = qs ? "?" + new URLSearchParams(qs).toString() : "";
  return `curl ${BASE}/${SLUG}${path}${q} \\
  -H "Authorization: Bearer ${TOKEN}"`;
}

function curlBody(method: Method, path: string, body: object): string {
  return `curl -X ${method} ${BASE}/${SLUG}${path} \\
  -H "Authorization: Bearer ${TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body, null, 2)}'`;
}

function jsGet(path: string, qs?: Record<string, string>): string {
  const q = qs ? "?" + new URLSearchParams(qs).toString() : "";
  return `const res = await fetch(
  "${BASE}/${SLUG}${path}${q}",
  { headers: { Authorization: "Bearer ${TOKEN}" } },
);
const data = await res.json();`;
}

function jsBody(method: Method, path: string, body: object): string {
  return `const res = await fetch(
  "${BASE}/${SLUG}${path}",
  {
    method: "${method}",
    headers: {
      Authorization: "Bearer ${TOKEN}",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(${JSON.stringify(body, null, 6).replace(/\n/g, "\n    ")}),
  },
);
const data = await res.json();`;
}

/* ─────────────────────────────────────────────────────────────────────
 * Sections
 * ─────────────────────────────────────────────────────────────────── */

export const SECTIONS: Section[] = [
  /* ────────────────── Getting started ────────────────── */
  {
    id: "introduction",
    title: "Introduction",
    intro: `The WCN Cloud Customer API is organised around REST. It returns JSON-encoded responses and uses standard HTTP response codes, authentication, and verbs.

All requests are scoped to your customer slug — the short identifier that appears in your console URL (e.g. \`testingcustomer\`). Your slug appears in every endpoint path.

**Base URL**

\`\`\`
${BASE}/{slug}
\`\`\`

All examples in this documentation use \`${SLUG}\` as a placeholder. Replace it with your own slug.

**Conventions**

- IDs (apps, VMs, snapshots, tokens) are opaque strings — don't parse them.
- Timestamps are ISO 8601 with timezone (\`2026-06-02T19:01:27Z\`).
- Boolean fields are returned literal \`true\`/\`false\`, never \`0\`/\`1\`.
- Empty list responses are \`[]\`, not \`null\`.`,
  },

  /* ────────────────── Authentication ────────────────── */
  {
    id: "authentication",
    title: "Authentication",
    intro: `The WCN Cloud API uses bearer-token authentication. Generate a token in the [API tokens](/dashboard/api-tokens) tab of the console, then pass it in the \`Authorization\` header of every request:

\`\`\`http
Authorization: Bearer ${TOKEN}
\`\`\`

Tokens are scoped to the customer they were created under — you cannot use a token from one customer to access another.

**Scopes**

Each token is created with one or more scopes in the format \`<resource>:<level>\`.

| Resource  | Description                                   |
|-----------|-----------------------------------------------|
| \`vms\`     | VM power, snapshots, backups, resize          |
| \`apps\`    | Deployed application CRUD + lifecycle         |
| \`backups\` | Backup policy + snapshots                     |
| \`domains\` | Custom domains and SSL                        |
| \`secrets\` | Per-app secret store                          |
| \`audit\`   | Audit log read access                         |
| \`metrics\` | Resource time-series (CPU, memory, network)   |

| Level    | Permission                                                |
|----------|-----------------------------------------------------------|
| \`read\`   | GET only                                                  |
| \`write\`  | GET + POST + PATCH + DELETE                                |
| \`admin\`  | Everything in \`write\` plus token + team management        |

**Errors**

A missing or invalid token returns:

\`\`\`json
{ "error": "unauthorized", "code": "invalid_token" }
\`\`\`

with HTTP \`401\`. A valid token without the required scope returns \`403\` with \`code: "forbidden"\`.`,
  },

  /* ────────────────── Errors ────────────────── */
  {
    id: "errors",
    title: "Errors",
    intro: `The API uses conventional HTTP status codes to indicate success or failure.

| Code | Meaning                                                    |
|------|------------------------------------------------------------|
| 200  | Success                                                    |
| 201  | Created                                                    |
| 400  | Validation error (body / params)                           |
| 401  | Missing or invalid token                                   |
| 403  | Token lacks required scope                                 |
| 404  | Resource not found (or not visible to your slug)           |
| 409  | Conflict (e.g. duplicate name, app currently building)     |
| 500  | Server error — retry after a moment                        |
| 502  | Upstream timeout (Coolify / Proxmox unreachable)           |

Every non-2xx body has the shape:

\`\`\`json
{
  "error": "human-readable message",
  "code": "machine_readable_code"
}
\`\`\`

Common \`code\` values: \`not_found\`, \`invalid_token\`, \`forbidden\`, \`missing_slug\`, \`invalid_body\`, \`coolify_error\`, \`upstream_timeout\`.`,
  },

  /* ────────────────── Apps ────────────────── */
  {
    id: "apps",
    title: "Apps",
    intro: `Apps are individual deployable workloads on your VM. Each customer can have many apps; they're routed by subdomain (\`<app-name>.<your-slug>.western-communication.com\`).`,
    endpoints: [
      {
        id: "apps-list",
        method: "GET",
        path: "/apps",
        title: "List apps",
        description: "Returns every app in your account, newest first.",
        scope: "apps:read",
        examples: {
          curl: curlGet("/apps"),
          js: jsGet("/apps"),
          response: `[
  {
    "id": "f6c826f1-4317-4547-aab4-0809d4c06364",
    "customer_slug": "${SLUG}",
    "name": "microtik",
    "source_type": "git",
    "source_repo": "https://github.com/you/microtik",
    "source_branch": "main",
    "build_pack": "nixpacks",
    "status": "running",
    "coolify_app_uuid": "i4k1zncqlo8j7izh8419lykn",
    "last_deploy_at": "2026-06-02T14:02:06.396164Z",
    "created_at": "2026-06-02T13:59:16.363143Z"
  }
]`,
        },
      },
      {
        id: "apps-create",
        method: "POST",
        path: "/apps",
        title: "Create an app",
        description: "Creates a new app and registers it with the underlying Coolify project. The app is created in `pending` status; trigger a deploy explicitly via `POST /apps/{id}/deploy`.",
        scope: "apps:write",
        params: [
          { name: "name", type: "string", in: "body", required: true, description: "Lowercase, alphanumeric + dashes. 1–63 chars. Used in the app's subdomain." },
          { name: "source_type", type: "enum", in: "body", required: true, description: "`git` (build from a git repo), `dockerfile`, or `dockerimage` (pre-built)." },
          { name: "source_repo", type: "string", in: "body", description: "Required for `git` and `dockerfile`. HTTPS URL to a public repo." },
          { name: "source_branch", type: "string", in: "body", description: "Defaults to `main`." },
          { name: "docker_image", type: "string", in: "body", description: "Required for `dockerimage`. e.g. `nginx:1.27`." },
          { name: "build_pack", type: "enum", in: "body", description: "`nixpacks` (default), `static`, `dockerfile`, `dockercompose`." },
        ],
        examples: {
          curl: curlBody("POST", "/apps", {
            name: "hello",
            source_type: "git",
            source_repo: "https://github.com/you/hello",
            source_branch: "main",
          }),
          js: jsBody("POST", "/apps", {
            name: "hello",
            source_type: "git",
            source_repo: "https://github.com/you/hello",
            source_branch: "main",
          }),
          response: `{
  "id": "8a31c9e0-...-...",
  "name": "hello",
  "status": "pending",
  "coolify_app_uuid": "h3llo123abc...",
  "created_at": "2026-06-02T19:30:00Z"
}`,
        },
      },
      {
        id: "apps-get",
        method: "GET",
        path: "/apps/{id}",
        title: "Get an app",
        description: "Returns one app by id.",
        scope: "apps:read",
        params: [
          { name: "id", type: "string", in: "path", required: true, description: "The app's UUID." },
        ],
        examples: {
          curl: curlGet("/apps/f6c826f1-4317-4547-aab4-0809d4c06364"),
          js: jsGet("/apps/f6c826f1-4317-4547-aab4-0809d4c06364"),
        },
      },
      {
        id: "apps-update",
        method: "PATCH",
        path: "/apps/{id}",
        title: "Update an app",
        description: "Patch any of `name`, `source_repo`, `source_branch`, `docker_image`, `build_pack`. Other fields are read-only.",
        scope: "apps:write",
        examples: {
          curl: curlBody("PATCH", "/apps/{id}", { source_branch: "production" }),
          js: jsBody("PATCH", "/apps/{id}", { source_branch: "production" }),
        },
      },
      {
        id: "apps-delete",
        method: "DELETE",
        path: "/apps/{id}",
        title: "Delete an app",
        description: "Removes the app and its container. Irreversible. Domains and env vars are cascaded.",
        scope: "apps:write",
        examples: {
          curl: `curl -X DELETE ${BASE}/${SLUG}/apps/{id} \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch(
  "${BASE}/${SLUG}/apps/{id}",
  { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } },
);`,
          response: `{ "ok": true }`,
        },
      },
      {
        id: "apps-deploy",
        method: "POST",
        path: "/apps/{id}/deploy",
        title: "Trigger a deploy",
        description: "Queues a new deployment. Set `force: true` to rebuild without the layer cache.",
        scope: "apps:write",
        params: [
          { name: "force", type: "boolean", in: "body", description: "Skip Docker layer cache. Slower but useful if a build is wedged." },
        ],
        examples: {
          curl: curlBody("POST", "/apps/{id}/deploy", { force: false }),
          js: jsBody("POST", "/apps/{id}/deploy", { force: false }),
          response: `{
  "deployment_uuid": "y137dyldr51dr2tnnegvyq0d",
  "status": "queued",
  "started_at": "2026-06-02T19:30:00Z",
  "finished_at": null
}`,
        },
      },
      {
        id: "apps-deployments",
        method: "GET",
        path: "/apps/{id}/deployments",
        title: "List deployments",
        description: "Most recent deployments first. Each item includes `status` (`queued` / `in_progress` / `finished` / `failed` / `cancelled`) and `commit`.",
        scope: "apps:read",
        examples: {
          curl: curlGet("/apps/{id}/deployments"),
          js: jsGet("/apps/{id}/deployments"),
        },
      },
      {
        id: "apps-logs",
        method: "GET",
        path: "/apps/{id}/logs",
        title: "Get runtime logs",
        description: "Returns the most recent stdout/stderr lines from the running container. Append `?follow=1` to receive a Server-Sent Events stream that emits each new line as it arrives.",
        scope: "apps:read",
        params: [
          { name: "tail", type: "integer", in: "query", description: "Number of lines to return (default 200, max 5000)." },
          { name: "follow", type: "boolean", in: "query", description: "`1` or `true` to open an SSE stream." },
        ],
        examples: {
          curl: curlGet("/apps/{id}/logs", { tail: "500" }),
          js: jsGet("/apps/{id}/logs", { tail: "500" }),
          response: `{
  "lines": [
    "Next.js 16.0.1 ready in 323ms",
    "Listening on http://0.0.0.0:3000"
  ],
  "available": true
}`,
        },
      },
      {
        id: "apps-metrics",
        method: "GET",
        path: "/apps/{id}/metrics",
        title: "Get app metrics",
        description: "Returns CPU / RAM / network time-series for the app's container over the requested window.",
        scope: "metrics:read",
        params: [
          { name: "window", type: "enum", in: "query", description: "`1h` (default), `24h`, `7d`, `30d`." },
          { name: "series", type: "string", in: "query", description: "Comma-separated: any of `cpu`, `ram`, `net`. Default `cpu,ram,net`." },
        ],
        examples: {
          curl: curlGet("/apps/{id}/metrics", { window: "1h", series: "cpu,ram" }),
          js: jsGet("/apps/{id}/metrics", { window: "1h", series: "cpu,ram" }),
          response: `{
  "window": "1h",
  "step": "30s",
  "container": "i4k1zncqlo8j7izh8419lykn-140231676856",
  "series": {
    "cpu":     [ { "ts": 1780409527, "value": 0.0001 } ],
    "ram":     [ { "ts": 1780409527, "value": 100024320 } ]
  }
}`,
        },
      },
      {
        id: "apps-restart",
        method: "POST",
        path: "/apps/{id}/restart",
        title: "Restart",
        description: "Restarts the running container in-place.",
        scope: "apps:write",
        examples: {
          curl: `curl -X POST ${BASE}/${SLUG}/apps/{id}/restart \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch("${BASE}/${SLUG}/apps/{id}/restart", {
  method: "POST",
  headers: { Authorization: "Bearer ${TOKEN}" },
});`,
        },
      },
      {
        id: "apps-stop",
        method: "POST",
        path: "/apps/{id}/stop",
        title: "Stop",
        description: "Stops the container. The app becomes `stopped`; HTTP routes return 502 until you start it again.",
        scope: "apps:write",
        examples: {
          curl: `curl -X POST ${BASE}/${SLUG}/apps/{id}/stop \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch("${BASE}/${SLUG}/apps/{id}/stop", {
  method: "POST",
  headers: { Authorization: "Bearer ${TOKEN}" },
});`,
        },
      },
      {
        id: "apps-start",
        method: "POST",
        path: "/apps/{id}/start",
        title: "Start",
        description: "Boot a previously-stopped app.",
        scope: "apps:write",
        examples: {
          curl: `curl -X POST ${BASE}/${SLUG}/apps/{id}/start \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch("${BASE}/${SLUG}/apps/{id}/start", {
  method: "POST",
  headers: { Authorization: "Bearer ${TOKEN}" },
});`,
        },
      },
    ],
  },

  /* ────────────────── VMs ────────────────── */
  {
    id: "vms",
    title: "VMs",
    intro: `Every customer has exactly one VM. These endpoints control its power state, snapshots, and backups.`,
    endpoints: [
      {
        id: "vm-power",
        method: "GET",
        path: "/vm/power",
        title: "Get power state",
        description: "Returns the current VM state: `running`, `stopped`, or `rebooting`.",
        scope: "vms:read",
        examples: {
          curl: curlGet("/vm/power"),
          js: jsGet("/vm/power"),
          response: `{ "state": "running", "uptime_seconds": 184320 }`,
        },
      },
      {
        id: "vm-restart",
        method: "POST",
        path: "/vm/restart",
        title: "Restart VM",
        description: "Reboot the VM. Site unreachable for ~30s.",
        scope: "vms:write",
        examples: {
          curl: `curl -X POST ${BASE}/${SLUG}/vm/restart \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch("${BASE}/${SLUG}/vm/restart", {
  method: "POST",
  headers: { Authorization: "Bearer ${TOKEN}" },
});`,
        },
      },
      {
        id: "vm-stop",
        method: "POST",
        path: "/vm/stop",
        title: "Stop VM",
        description: "Power off the VM. The site is unavailable until you start it again.",
        scope: "vms:write",
        examples: {
          curl: `curl -X POST ${BASE}/${SLUG}/vm/stop \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch("${BASE}/${SLUG}/vm/stop", {
  method: "POST",
  headers: { Authorization: "Bearer ${TOKEN}" },
});`,
        },
      },
      {
        id: "vm-start",
        method: "POST",
        path: "/vm/start",
        title: "Start VM",
        description: "Boot the VM from its current state.",
        scope: "vms:write",
        examples: {
          curl: `curl -X POST ${BASE}/${SLUG}/vm/start \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch("${BASE}/${SLUG}/vm/start", {
  method: "POST",
  headers: { Authorization: "Bearer ${TOKEN}" },
});`,
        },
      },
      {
        id: "vm-snapshots-list",
        method: "GET",
        path: "/vm/snapshots",
        title: "List snapshots",
        description: "Point-in-time snapshots of the VM disk. Newest first.",
        scope: "backups:read",
        examples: {
          curl: curlGet("/vm/snapshots"),
          js: jsGet("/vm/snapshots"),
          response: `[
  { "name": "pre-upgrade", "created_at": "2026-06-01T12:00:00Z", "size_bytes": 4831838208 }
]`,
        },
      },
      {
        id: "vm-snapshots-create",
        method: "POST",
        path: "/vm/snapshots",
        title: "Create a snapshot",
        description: "Snapshots the VM disk. The VM stays running. Snapshots are local; for off-site safety create a backup.",
        scope: "backups:write",
        params: [
          { name: "name", type: "string", in: "body", required: true, description: "Lowercase, alphanumeric + dashes. Unique per customer." },
        ],
        examples: {
          curl: curlBody("POST", "/vm/snapshots", { name: "pre-upgrade" }),
          js: jsBody("POST", "/vm/snapshots", { name: "pre-upgrade" }),
        },
      },
      {
        id: "vm-snapshots-revert",
        method: "POST",
        path: "/vm/snapshots/{name}/revert",
        title: "Revert to snapshot",
        description: "Roll the VM back to the named snapshot. Destructive — anything written after the snapshot is lost. The VM is briefly stopped during the revert.",
        scope: "backups:admin",
        examples: {
          curl: `curl -X POST ${BASE}/${SLUG}/vm/snapshots/pre-upgrade/revert \\
  -H "Authorization: Bearer ${TOKEN}"`,
          js: `await fetch("${BASE}/${SLUG}/vm/snapshots/pre-upgrade/revert", {
  method: "POST",
  headers: { Authorization: "Bearer ${TOKEN}" },
});`,
        },
      },
      {
        id: "vm-metrics",
        method: "GET",
        path: "/vm/metrics",
        title: "VM metrics",
        description: "Host-level CPU / RAM / disk / net time series, summed across all containers on the VM.",
        scope: "metrics:read",
        params: [
          { name: "window", type: "enum", in: "query", description: "`1h` / `24h` / `7d` / `30d`." },
          { name: "series", type: "string", in: "query", description: "Comma-separated: `cpu`, `ram`, `disk`, `net`. Default `cpu,ram,disk,net`." },
        ],
        examples: {
          curl: curlGet("/vm/metrics", { window: "24h" }),
          js: jsGet("/vm/metrics", { window: "24h" }),
        },
      },
    ],
  },

  /* ────────────────── Stub sections (will fill out in follow-up sessions) ────────────────── */
  {
    id: "env",
    title: "Environment variables",
    intro: "Per-app environment variables. Saved server-side and injected into the container on next deploy.",
    endpoints: [
      { id: "env-get", method: "GET", path: "/apps/{id}/env", title: "Get env vars", description: "Returns every variable set for the app.", scope: "apps:read", stub: true,
        examples: { curl: curlGet("/apps/{id}/env"), js: jsGet("/apps/{id}/env") } },
      { id: "env-put", method: "PUT", path: "/apps/{id}/env", title: "Replace env vars", description: "Replaces the entire env-var set with the supplied array.", scope: "apps:write", stub: true,
        examples: { curl: curlBody("PUT", "/apps/{id}/env", [{ key: "NODE_ENV", value: "production" }]), js: jsBody("PUT", "/apps/{id}/env", [{ key: "NODE_ENV", value: "production" }]) } },
      { id: "env-import", method: "POST", path: "/apps/{id}/env/import", title: "Import .env text", description: "Parses a `.env`-format text body and replaces all vars in one call.", scope: "apps:write", stub: true,
        examples: { curl: curlBody("POST", "/apps/{id}/env/import", { text: "FOO=bar\nBAZ=qux" }), js: jsBody("POST", "/apps/{id}/env/import", { text: "FOO=bar\nBAZ=qux" }) } },
    ],
  },
  {
    id: "secrets",
    title: "Secrets",
    intro: "Encrypted-at-rest key/value pairs. Values are write-only; the API exposes a separate Reveal endpoint that requires the user's password.",
    endpoints: [
      { id: "secrets-list", method: "GET", path: "/apps/{id}/secrets", title: "List secret keys", description: "Returns the keys (but not the values). Values are never exposed in list responses.", scope: "secrets:read", stub: true,
        examples: { curl: curlGet("/apps/{id}/secrets"), js: jsGet("/apps/{id}/secrets") } },
      { id: "secrets-create", method: "POST", path: "/apps/{id}/secrets", title: "Create a secret", description: "Stores a new secret. Returns 409 if the key already exists.", scope: "secrets:write", stub: true,
        examples: { curl: curlBody("POST", "/apps/{id}/secrets", { key: "STRIPE_API_KEY", value: "sk_live_…" }), js: jsBody("POST", "/apps/{id}/secrets", { key: "STRIPE_API_KEY", value: "sk_live_…" }) } },
      { id: "secrets-reveal", method: "POST", path: "/apps/{id}/secrets/reveal", title: "Reveal a secret", description: "Returns the plain value once. Requires the user's console password for confirmation.", scope: "secrets:admin", stub: true,
        examples: { curl: curlBody("POST", "/apps/{id}/secrets/reveal", { key: "STRIPE_API_KEY", password: "***" }), js: jsBody("POST", "/apps/{id}/secrets/reveal", { key: "STRIPE_API_KEY", password: "***" }) } },
      { id: "secrets-delete", method: "DELETE", path: "/apps/{id}/secrets/{key}", title: "Delete a secret", description: "Removes the secret. The next deploy no longer injects it.", scope: "secrets:write", stub: true,
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/apps/{id}/secrets/STRIPE_API_KEY -H "Authorization: Bearer ${TOKEN}"`, js: `await fetch("${BASE}/${SLUG}/apps/{id}/secrets/STRIPE_API_KEY", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },
    ],
  },
  {
    id: "domains",
    title: "Domains",
    intro: "Map your own DNS hostnames to an app. We provision the SSL cert via Cloudflare Total TLS automatically.",
    endpoints: [
      { id: "domains-list", method: "GET", path: "/apps/{id}/domains", title: "List domains", description: "Every hostname attached to the app, with cert + verification status.", scope: "domains:read", stub: true,
        examples: { curl: curlGet("/apps/{id}/domains"), js: jsGet("/apps/{id}/domains") } },
      { id: "domains-add", method: "POST", path: "/apps/{id}/domains", title: "Add a domain", description: "Adds a custom hostname. You'll need to point the DNS CNAME at the value we return in the response.", scope: "domains:write", stub: true,
        examples: { curl: curlBody("POST", "/apps/{id}/domains", { hostname: "app.example.com" }), js: jsBody("POST", "/apps/{id}/domains", { hostname: "app.example.com" }) } },
      { id: "domains-remove", method: "DELETE", path: "/apps/{id}/domains/{hostname}", title: "Remove a domain", description: "Unmaps the hostname. Revokes the cert.", scope: "domains:write", stub: true,
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/apps/{id}/domains/app.example.com -H "Authorization: Bearer ${TOKEN}"`, js: `await fetch("${BASE}/${SLUG}/apps/{id}/domains/app.example.com", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },
    ],
  },
  {
    id: "cron",
    title: "Scheduled tasks (cron)",
    intro: "Per-app cron jobs. Each task runs `command` on the schedule `frequency` inside the app's container.",
    endpoints: [
      { id: "cron-list", method: "GET", path: "/apps/{id}/cron", title: "List tasks", description: "Every scheduled task on the app.", scope: "apps:read", stub: true,
        examples: { curl: curlGet("/apps/{id}/cron"), js: jsGet("/apps/{id}/cron") } },
      { id: "cron-create", method: "POST", path: "/apps/{id}/cron", title: "Create a task", description: "Schedule a new task.", scope: "apps:write", stub: true,
        examples: { curl: curlBody("POST", "/apps/{id}/cron", { name: "daily-report", command: "node scripts/report.js", frequency: "0 6 * * *" }), js: jsBody("POST", "/apps/{id}/cron", { name: "daily-report", command: "node scripts/report.js", frequency: "0 6 * * *" }) } },
      { id: "cron-delete", method: "DELETE", path: "/apps/{id}/cron/{task_uuid}", title: "Delete a task", description: "Remove the task.", scope: "apps:write", stub: true,
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/apps/{id}/cron/{task_uuid} -H "Authorization: Bearer ${TOKEN}"`, js: `await fetch("${BASE}/${SLUG}/apps/{id}/cron/{task_uuid}", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },
    ],
  },
  {
    id: "database",
    title: "Database",
    intro: "Read-only Postgres queries against your Supabase database (if your tier includes one).",
    endpoints: [
      { id: "db-tables", method: "GET", path: "/db/tables", title: "List tables", description: "Every table visible to your customer-scoped role.", scope: "vms:read", stub: true,
        examples: { curl: curlGet("/db/tables"), js: jsGet("/db/tables") } },
      { id: "db-query", method: "POST", path: "/db/query", title: "Run a query", description: "Execute a single SELECT. Other statement types are rejected.", scope: "vms:read", stub: true,
        examples: { curl: curlBody("POST", "/db/query", { sql: "SELECT count(*) FROM orders" }), js: jsBody("POST", "/db/query", { sql: "SELECT count(*) FROM orders" }) } },
    ],
  },
  {
    id: "team",
    title: "Team",
    intro: "Invite, list, and remove team members on the customer account.",
    endpoints: [
      { id: "team-list", method: "GET", path: "/team", title: "List members", description: "Every member with their role.", scope: "audit:read", stub: true,
        examples: { curl: curlGet("/team"), js: jsGet("/team") } },
      { id: "team-invite", method: "POST", path: "/team/invites", title: "Invite a member", description: "Sends an email invite to join your customer team with the given role.", scope: "audit:admin", stub: true,
        examples: { curl: curlBody("POST", "/team/invites", { email: "new@example.com", role: "developer" }), js: jsBody("POST", "/team/invites", { email: "new@example.com", role: "developer" }) } },
      { id: "team-remove", method: "DELETE", path: "/team/{id}", title: "Remove a member", description: "Revoke access. Owner cannot be removed via the API.", scope: "audit:admin", stub: true,
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/team/{id} -H "Authorization: Bearer ${TOKEN}"`, js: `await fetch("${BASE}/${SLUG}/team/{id}", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },
    ],
  },
  {
    id: "tokens",
    title: "API tokens",
    intro: "Manage your own API tokens. Useful for rotation.",
    endpoints: [
      { id: "tokens-list", method: "GET", path: "/tokens", title: "List tokens", description: "Returns metadata for every token on the account. Plain values are NEVER returned after creation.", scope: "audit:admin", stub: true,
        examples: { curl: curlGet("/tokens"), js: jsGet("/tokens") } },
      { id: "tokens-create", method: "POST", path: "/tokens", title: "Create a token", description: "Returns the plain token value ONCE in `value`. Store it now — there's no way to retrieve it later.", scope: "audit:admin", stub: true,
        examples: { curl: curlBody("POST", "/tokens", { name: "CI deploy", scopes: ["apps:write", "domains:read"] }), js: jsBody("POST", "/tokens", { name: "CI deploy", scopes: ["apps:write", "domains:read"] }) } },
      { id: "tokens-delete", method: "DELETE", path: "/tokens/{id}", title: "Revoke a token", description: "Token stops working immediately.", scope: "audit:admin", stub: true,
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/tokens/{id} -H "Authorization: Bearer ${TOKEN}"`, js: `await fetch("${BASE}/${SLUG}/tokens/{id}", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },
    ],
  },
  {
    id: "audit",
    title: "Audit log",
    intro: "Read-only timeline of every action taken on the account.",
    endpoints: [
      { id: "audit-list", method: "GET", path: "/audit", title: "List audit entries", description: "Newest first. Paginate with `?before=<id>`.", scope: "audit:read", stub: true,
        examples: { curl: curlGet("/audit", { limit: "100" }), js: jsGet("/audit", { limit: "100" }) } },
    ],
  },
];
