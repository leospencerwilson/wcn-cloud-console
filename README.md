# WCN Cloud Console

Next.js 16 (App Router) console for WCN Cloud — WCN-admin and customer-admin
front-end. Runs at `https://console.western-communication.com`.

## What it does

- WCN admins create customer records and issue invites
- Invitees accept an invite, set a password, and land in their customer
  dashboard
- The console issues a forward-auth JWT cookie scoped to `.western-communication.com`,
  which Caddy on each customer VM validates via `/api/verify` before proxying

## Local dev

```bash
cp .env.example .env.local
# fill in the vars (see below)

npm install
npm run dev
```

Open http://localhost:3000.

## Required env vars

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Self-hosted Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only, used to create users at invite-acceptance) |
| `OPS_DB_URL` | Postgres URL for `wcn_cloud_ops` |
| `FORWARD_AUTH_SECRET` | 32+ byte secret for signing forward-auth JWTs |
| `ROOT_DOMAIN` | e.g. `western-communication.com` |
| `INVITE_BASE_URL` | e.g. `https://console.western-communication.com` |

## Deploy

Built and deployed via the self-hosted Coolify on `10.10.30.10`. Push to `main`
triggers a Coolify build.

Set all of the env vars above in the Coolify app's environment.

## Caddy integration on customer VMs

Each customer VM's Caddy must `forward_auth` to this console — see the snippet
in the deployment runbooks (or below at the bottom of the scaffold summary).
