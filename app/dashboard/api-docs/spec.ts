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
    intro: `Postgres CRUD against the **public schema** of your managed Supabase database.

The \`auth.*\`, \`storage.*\`, \`realtime.*\` and \`_supabase\` schemas are intentionally not reachable through this section — manage them via the **Supabase** section instead (auth users, storage buckets, RLS policies, realtime publications). Trying to pass \`?schema=auth\` is coerced to \`public\` server-side.

Values for INSERT and UPDATE are decoded via Postgres's own \`jsonb_populate_record\` — send a typed JSON object and the database does the casting. Identity / DEFAULT columns the request omits fire normally.`,
    endpoints: [
      { id: "db-tables", method: "GET", path: "/db/tables", title: "List tables", description: "All public-schema tables with size and estimated row count.", scope: "vms:read",
        examples: { curl: curlGet("/db/tables"), js: jsGet("/db/tables"),
          response: `[
  { "schema": "public", "name": "orders", "size_bytes": 16384, "estimated_rows": 0 }
]` } },
      { id: "db-table-create", method: "POST", path: "/db/tables", title: "Create a table", description: "Create a new public-schema table. `columns[]` accepts the full Supabase option set: `name`, `type`, `nullable`, `default` (SQL expression), `primary_key`, `unique`, `identity` (`\"always\"` | `\"by_default\"`), `check`, `comment`, `foreign_key` (`{ref_table, ref_column, on_delete, on_update}`).", scope: "vms:write",
        examples: {
          curl: curlBody("POST", "/db/tables", { name: "orders", columns: [
            { name: "id", type: "int8", identity: "by_default", nullable: false, primary_key: true },
            { name: "customer", type: "text", nullable: false },
            { name: "total_pence", type: "int8", nullable: false, check: "total_pence >= 0" },
            { name: "created_at", type: "timestamptz", default: "now()", nullable: false },
          ], comment: "Customer orders" }),
          js: jsBody("POST", "/db/tables", { name: "orders", columns: [
            { name: "id", type: "int8", identity: "by_default", nullable: false, primary_key: true },
            { name: "total_pence", type: "int8", nullable: false },
          ] }) } },
      { id: "db-table-info", method: "GET", path: "/db/tables/{name}/info", title: "Get table info", description: "Full column metadata + RLS status + table comment. Use this to render an editor — every field needed for `PATCH` is in the response.", scope: "vms:read",
        examples: { curl: curlGet("/db/tables/orders/info"), js: jsGet("/db/tables/orders/info"),
          response: `{
  "columns": [
    { "name": "id", "data_type": "bigint", "udt_name": "int8",
      "nullable": false, "default": null, "identity": true, "primary_key": true,
      "comment": null, "ordinal_position": 1,
      "character_maximum_length": null, "numeric_precision": 64, "numeric_scale": 0 }
  ],
  "comment": "Customer orders",
  "rls_enabled": false
}` } },
      { id: "db-table-rename", method: "PATCH", path: "/db/tables/{name}", title: "Rename / comment table", description: "Rename the table and/or update its `COMMENT ON TABLE`. Send only the fields you want to change.", scope: "vms:write",
        examples: { curl: curlBody("PATCH", "/db/tables/orders", { new_name: "customer_orders", comment: "Renamed for clarity" }),
                    js: jsBody("PATCH", "/db/tables/orders", { new_name: "customer_orders" }) } },
      { id: "db-table-drop", method: "DELETE", path: "/db/tables/{name}", title: "Drop table", description: "Permanent. Dependent foreign keys will block unless removed first.", scope: "vms:write",
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/db/tables/orders \\\n  -H "Authorization: Bearer ${TOKEN}"`,
                    js: `await fetch("${BASE}/${SLUG}/db/tables/orders", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },

      { id: "db-column-add", method: "POST", path: "/db/tables/{name}/columns", title: "Add a column", description: "Same column shape as `POST /db/tables` accepts in its `columns[]` array.", scope: "vms:write",
        examples: { curl: curlBody("POST", "/db/tables/orders/columns", { name: "shipped", type: "bool", default: "false", nullable: false, comment: "Shipped flag" }),
                    js: jsBody("POST", "/db/tables/orders/columns", { name: "shipped", type: "bool", default: "false", nullable: false }) } },
      { id: "db-column-alter", method: "PATCH", path: "/db/tables/{name}/columns/{column}", title: "Alter a column", description: "Rename, change type, toggle nullability, set/drop default, set comment. Optional `type_using` provides the `USING` clause for type changes that need a cast expression (e.g. `\"text::int\"`).", scope: "vms:write",
        examples: { curl: curlBody("PATCH", "/db/tables/orders/columns/shipped", { nullable: true, default: "false" }),
                    js: jsBody("PATCH", "/db/tables/orders/columns/shipped", { new_name: "is_shipped", type: "boolean" }) } },
      { id: "db-column-drop", method: "DELETE", path: "/db/tables/{name}/columns/{column}", title: "Drop a column", description: "Permanent. Dependent indexes / FKs are dropped with it.", scope: "vms:write",
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/db/tables/orders/columns/shipped \\\n  -H "Authorization: Bearer ${TOKEN}"`,
                    js: `await fetch("${BASE}/${SLUG}/db/tables/orders/columns/shipped", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },

      { id: "db-rows-list", method: "GET", path: "/db/rows", title: "List rows", description: "Paginated SELECT against a public table. Required query `table`; optional `limit` (default 50, max 500) and `offset`. Response includes an exact total `count(*)` so you can render `1–50 of N` pagers.", scope: "vms:read",
        examples: { curl: curlGet("/db/rows", { table: "orders", limit: "50", offset: "0" }),
                    js: jsGet("/db/rows", { table: "orders", limit: "50" }),
                    response: `{ "rows": [ { "id": 1, "customer": "acme", "total_pence": 12000 } ], "total": 1, "limit": 50, "offset": 0 }` } },
      { id: "db-row-insert", method: "POST", path: "/db/tables/{name}/rows", title: "Insert a row", description: "Only the columns you supply are inserted; identity / DEFAULT columns you omit fire on the DB side. Send typed values inside `values` (numbers, booleans, JSON objects, ISO timestamps).", scope: "vms:write",
        examples: { curl: curlBody("POST", "/db/tables/orders/rows", { values: { customer: "acme", total_pence: 12000 } }),
                    js: jsBody("POST", "/db/tables/orders/rows", { values: { customer: "acme", total_pence: 12000 } }) } },
      { id: "db-row-update", method: "PATCH", path: "/db/tables/{name}/rows", title: "Update a row", description: "Identify the row with `pk` (`{column: value, …}` — composite PKs supported) and patch fields under `values`. Same type-cast pipeline as insert.", scope: "vms:write",
        examples: { curl: curlBody("PATCH", "/db/tables/orders/rows", { pk: { id: 1 }, values: { total_pence: 15000 } }),
                    js: jsBody("PATCH", "/db/tables/orders/rows", { pk: { id: 1 }, values: { total_pence: 15000 } }) } },
      { id: "db-row-delete", method: "DELETE", path: "/db/tables/{name}/rows", title: "Delete a row", description: "Body identifies the row by its primary key. Tables without a primary key cannot delete rows via this endpoint — run a `DELETE` via `POST /db/query` instead.", scope: "vms:write",
        examples: { curl: curlBody("DELETE", "/db/tables/orders/rows", { pk: { id: 1 } }),
                    js: jsBody("DELETE", "/db/tables/orders/rows", { pk: { id: 1 } }) } },

      { id: "db-columns", method: "GET", path: "/db/columns", title: "List columns (legacy)", description: "Convenience endpoint returning `{name, data_type, is_nullable, column_default, ordinal_position}` for a single public table. Prefer `/db/tables/{name}/info`, which returns richer metadata.", scope: "vms:read",
        examples: { curl: curlGet("/db/columns", { table: "orders" }), js: jsGet("/db/columns", { table: "orders" }) } },
      { id: "db-sizes", method: "GET", path: "/db/sizes", title: "Database size summary", description: "Total DB size in bytes plus the top public tables by on-disk size.", scope: "vms:read",
        examples: { curl: curlGet("/db/sizes"), js: jsGet("/db/sizes") } },
      { id: "db-query", method: "POST", path: "/db/query", title: "Run a query", description: "Execute arbitrary SQL via the customer-scoped role. Use this as the escape hatch when the CRUD endpoints above don't cover what you need.", scope: "vms:write",
        examples: { curl: curlBody("POST", "/db/query", { sql: "SELECT count(*) FROM orders" }), js: jsBody("POST", "/db/query", { sql: "SELECT count(*) FROM orders" }) } },
    ],
  },

  {
    id: "supabase",
    title: "Supabase",
    intro: `Admin operations on the auxiliary Supabase schemas: \`auth.users\`, \`storage.buckets\`, RLS policies on the public schema, the \`realtime\` publication, and edge functions. These wrap your project's Kong proxy at \`https://api-{slug}.western-communication.com\`.

The same scope rules apply: \`vms:read\` for GETs, \`vms:write\` for mutations. The Tables / Rows endpoints in the **Database** section above are the right tool for anything in the public schema; this section is for everything else.`,
    endpoints: [
      { id: "sb-connection", method: "GET", path: "/supabase/connection", title: "Connection details", description: "REST / Realtime / Storage / Auth URLs + the anon key. Use these to point a Supabase JS client (or the CLI) at your project.", scope: "vms:read",
        examples: { curl: curlGet("/supabase/connection"), js: jsGet("/supabase/connection") } },

      { id: "sb-auth-users", method: "GET", path: "/supabase/auth/users", title: "List auth users", description: "Paginated list of accounts in `auth.users`. `limit` defaults to 50, max 500. Each row carries email/phone confirmation flags, last sign-in, role, ban state, and raw metadata.", scope: "vms:read",
        examples: { curl: curlGet("/supabase/auth/users", { limit: "50", offset: "0" }), js: jsGet("/supabase/auth/users", { limit: "50" }) } },
      { id: "sb-auth-create", method: "POST", path: "/supabase/auth/users", title: "Invite or create user", description: "Creates a user via the GoTrue admin API. Omit `password` to send an invite-style flow; set `email_confirm: true` to skip the verification mail.", scope: "vms:write",
        examples: { curl: curlBody("POST", "/supabase/auth/users", { email: "user@example.com", email_confirm: true }),
                    js: jsBody("POST", "/supabase/auth/users", { email: "user@example.com", email_confirm: true }) } },
      { id: "sb-auth-update", method: "PATCH", path: "/supabase/auth/users/{id}", title: "Update / ban user", description: "Patch any GoTrue user field — email, password, metadata, role, or `ban_duration` (`\"none\"` | `\"24h\"` | `\"7d\"` | `\"permanent\"`).", scope: "vms:write",
        examples: { curl: curlBody("PATCH", "/supabase/auth/users/{id}", { ban_duration: "permanent" }),
                    js: jsBody("PATCH", "/supabase/auth/users/{id}", { user_metadata: { plan: "pro" } }) } },
      { id: "sb-auth-delete", method: "DELETE", path: "/supabase/auth/users/{id}", title: "Delete user", description: "Permanent. Hard-deletes the row from `auth.users`.", scope: "vms:write",
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/supabase/auth/users/{id} \\\n  -H "Authorization: Bearer ${TOKEN}"`,
                    js: `await fetch("${BASE}/${SLUG}/supabase/auth/users/{id}", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },

      { id: "sb-buckets-list", method: "GET", path: "/supabase/storage/buckets", title: "List storage buckets", description: "Every bucket with object count + total bytes.", scope: "vms:read",
        examples: { curl: curlGet("/supabase/storage/buckets"), js: jsGet("/supabase/storage/buckets") } },
      { id: "sb-buckets-create", method: "POST", path: "/supabase/storage/buckets", title: "Create bucket", description: "Create a bucket. `public: true` makes objects readable without auth. Optional `file_size_limit` (bytes) and `allowed_mime_types` (string array).", scope: "vms:write",
        examples: { curl: curlBody("POST", "/supabase/storage/buckets", { name: "uploads", public: false, file_size_limit: 10485760 }),
                    js: jsBody("POST", "/supabase/storage/buckets", { name: "uploads", public: false }) } },
      { id: "sb-buckets-delete", method: "DELETE", path: "/supabase/storage/buckets/{name}", title: "Delete bucket", description: "Empties the bucket then deletes it. Permanent.", scope: "vms:write",
        examples: { curl: `curl -X DELETE ${BASE}/${SLUG}/supabase/storage/buckets/uploads \\\n  -H "Authorization: Bearer ${TOKEN}"`,
                    js: `await fetch("${BASE}/${SLUG}/supabase/storage/buckets/uploads", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },

      { id: "sb-objects-list", method: "GET", path: "/supabase/storage/objects", title: "List objects", description: "Objects inside a single bucket. Required query `bucket`; optional `limit` (default 100, max 1000) and `offset`. Object upload itself isn't proxied yet — use the Supabase JS client pointed at your storage URL.", scope: "vms:read",
        examples: { curl: curlGet("/supabase/storage/objects", { bucket: "uploads", limit: "100" }),
                    js: jsGet("/supabase/storage/objects", { bucket: "uploads" }) } },
      { id: "sb-objects-delete", method: "DELETE", path: "/supabase/storage/objects", title: "Delete an object", description: "Body identifies the object by `bucket` + `name` (query string).", scope: "vms:write",
        examples: { curl: `curl -X DELETE "${BASE}/${SLUG}/supabase/storage/objects?bucket=uploads&name=img/cat.png" \\\n  -H "Authorization: Bearer ${TOKEN}"`,
                    js: `await fetch("${BASE}/${SLUG}/supabase/storage/objects?bucket=uploads&name=img%2Fcat.png", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },

      { id: "sb-policies-list", method: "GET", path: "/supabase/policies", title: "List RLS policies", description: "Every policy on the public schema, including command, roles, USING and WITH CHECK expressions.", scope: "vms:read",
        examples: { curl: curlGet("/supabase/policies"), js: jsGet("/supabase/policies") } },
      { id: "sb-policies-create", method: "POST", path: "/supabase/policies", title: "Create RLS policy", description: "Compose a `CREATE POLICY` statement. `cmd` is one of `SELECT` | `INSERT` | `UPDATE` | `DELETE` | `ALL`; `roles` is the role list (e.g. `[\"authenticated\"]`); `using` and `with_check` are the SQL expressions.", scope: "vms:write",
        examples: { curl: curlBody("POST", "/supabase/policies", { table: "orders", name: "own_orders", cmd: "SELECT", roles: ["authenticated"], using: "auth.uid() = customer_id" }),
                    js: jsBody("POST", "/supabase/policies", { table: "orders", name: "own_orders", cmd: "ALL", roles: ["authenticated"], using: "auth.uid() = customer_id", with_check: "auth.uid() = customer_id" }) } },
      { id: "sb-policies-delete", method: "DELETE", path: "/supabase/policies", title: "Drop RLS policy", description: "Identify the policy via `?table=…&name=…`. Schema is fixed to `public`.", scope: "vms:write",
        examples: { curl: `curl -X DELETE "${BASE}/${SLUG}/supabase/policies?table=orders&name=own_orders" \\\n  -H "Authorization: Bearer ${TOKEN}"`,
                    js: `await fetch("${BASE}/${SLUG}/supabase/policies?table=orders&name=own_orders", { method: "DELETE", headers: { Authorization: "Bearer ${TOKEN}" } });` } },

      { id: "sb-realtime", method: "GET", path: "/supabase/realtime", title: "Realtime overview", description: "Replication slots, publications, and the list of tables each publication includes. Read-only — replication control comes in a follow-up release.", scope: "vms:read",
        examples: { curl: curlGet("/supabase/realtime"), js: jsGet("/supabase/realtime") } },

      { id: "sb-functions", method: "GET", path: "/supabase/functions", title: "Edge functions overview", description: "Every function registered in the `supabase_functions` schema. Deploy via the Supabase CLI pointed at your storage / project URL.", scope: "vms:read",
        examples: { curl: curlGet("/supabase/functions"), js: jsGet("/supabase/functions") } },
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
