# Fixes — single batch

1. **Apps deployed card shows "Building" even when the app is running.**
   - Surface: `/dashboard/apps` deployed-apps card.
   - Expected: live status (`Running` / `Stopped` / `Deploying` / `Failed`).
   - Suspected cause: status field cached, or `deployment_status` is being read in place of the container/app runtime state.

2. **"View" buttons on the apps-deployed list and Custom Domains list aren't in the new vm-action style.**
   - Convert to `vm-action vm-action--view` (accent gold) inside a `vm-action-group`, matching the rest of the dashboard.

3. **Other buttons inside the deployed-apps area aren't styled either.**
   - Sweep every remaining `btn btn-primary` / `btn btn-ghost` on `/dashboard/apps/[id]/*` (app overview, env, secrets, domains, redirects, deployments, logs, metrics, cron, console) so the entire app-detail surface matches the new vm-action language.

4. **App detail page is missing the standard `<app>.<slug>.western-communication.com` link.**
   - Per-app subdomain routing was wired earlier — every app has a default URL under its customer slug.
   - Surface it prominently on the app overview (clickable, target=_blank), and also as the default in the Custom Domains list when no custom hostname is attached.

5. **Refresh button on the Logs tab isn't in the new vm-action style.**
   - Convert to `vm-action vm-action--view` (or matching neutral tone) inside a `vm-action-group`, with the `IconRefresh` glyph.

6. **Metrics tab: "Last 1h" resources card doesn't match the "Historical resources" card style.**
   - Bring the live-1h panel in line with the historical-resources panel (same card chrome, same axes, same legend, same colour tokens).

7. **Refresh button on the Environment tab isn't in the new vm-action style.**
   - Same treatment as #5 — `vm-action vm-action--view` with `IconRefresh`, alongside the existing Add / Import .env / Export .env group.

8. **Env vars: "type" controls (literal / build-time / preview / multiline / runtime) need to render on one line and use icon-chip styling.**
   - Currently they wrap onto multiple lines and read as plain checkboxes / text. Convert to a single-row pill-strip with icons (e.g. literal = `"`, build = hammer, runtime = play, preview = eye, multiline = lines).

9. **"Push to deploy" surfaces a `400 missing_slug` error.**
   - Trigger: clicking Push to deploy (webhook setup or deploy button) on the app detail page.
   - Root cause is likely a client fetch hitting `/api/customers/{slug}/...` with an empty slug (page-level slug not threaded through, or the URL is `/api/customers//...`).
   - Find which fetch is omitting the slug and pass it; also tighten the API route to return a clearer error.

10. **"Generate webhook" button needs the new style — AND replace the flow with auto-webhook now that we have OAuth.**
    - Cosmetic: convert the existing Generate webhook button to `vm-action vm-action--start` so it matches.
    - Bigger improvement: when the app was created from a GitHub-OAuth-connected repo, use the stored token to register the deploy webhook directly via `POST /repos/{owner}/{repo}/hooks` and skip the copy-paste step entirely.
    - Fallback (PAT-less / disconnected): keep the existing manual flow with a one-click clipboard copy.

11. **Domains tab: "Add domain" button needs to match the new style.**
    - Convert to `vm-action vm-action--start` with `IconPlus`.

12. **Remove the standalone Database tab from the dashboard nav.**
    - Everything it does is now in the Supabase area (Tables, SQL editor, Connection, etc.).
    - Drop the nav entry and delete the `/dashboard/database` route / page(s). Update any internal links (e.g. the old "Open SQL editor" CTA) to point at `/dashboard/supabase/sql`.

13. **Health tab: latency/pings panel feels cramped — make it dramatic and fill the empty space.**
    - Today it's a small inline metric. Promote it to a full-width card with a big sparkline / live histogram, oversized current-latency readout, and a clear status pill.
    - Use the room that's currently empty below the status block — the panel should be the visual anchor of the tab, not a footnote.

14. **Backups tab: Save changes / Refresh / Run backup now buttons need the new style.**
    - Save changes → `vm-action--start` (green check)
    - Refresh → `vm-action--view` (accent refresh)
    - Run backup now → `vm-action--restart` (brand) with a download/play icon
    - Group them in a single `vm-action-group` where they sit next to each other.

15. **Backups need to actually run AND be downloadable.**
    - Verify the Run backup now button reaches the provisioner and triggers a real backup (currently appears to no-op or fail silently).
    - Confirm backups land in the configured destination (S3 / local) per `BACKUP_PREFIX` in customer.env.
    - Each row in the backups list needs a working Download action — restore the `/vm/backups/[id]/download` route, hook up a per-row vm-action button.
    - Surface size, timestamp, status, and the download link clearly.

16. **Audit log: page should not scroll on the outer container.**
    - The audit list itself becomes the scroll container, capped at `100vh - header`, so the surrounding page chrome stays fixed.
    - End of the list sits at the bottom of the viewport (no whole-page scrollbar on the right).

17. **Audit log: buttons at the bottom of the list need the new vm-action style.**
    - Whatever pagination / export / refresh buttons live at the bottom of the audit panel — convert to `vm-action-group` with appropriate tones.

18. **Audit log: drop the separate Actor / Action search boxes.**
    - Use a single (now larger / full-width) free-text search that filters across actor, action, target, message, etc.
    - Keep date-range pickers if they exist, but the type-specific filter inputs go away.

19. **Audit log: "Clear filters" button needs the new vm-action style.**
    - `vm-action vm-action--stop` (red, with `IconX`) inside the same `vm-action-group` as the other audit-toolbar buttons.

20. **"Invite a team member" modal buttons need the new style.**
    - Cancel + Send invite — convert to `vm-action-group` (Cancel = `vm-action--stop`, Send invite = `vm-action--start`). Same pattern wherever the modal lives.

21. **"New API token" modal buttons need the new style.**
    - Cancel + Create token — same `vm-action-group` pattern as #20 (Cancel = `vm-action--stop`, Create = `vm-action--start`).

22. **"Copy token" modal buttons need the new style.**
    - Copy + Close / Done — `vm-action-group` (Copy = `vm-action--view`, Done = `vm-action--start` or neutral). Whatever's there today.

23. **API docs: kill the "Reference stub — expanded examples and field-level documentation coming in a follow-up." placeholder.**
    - Every endpoint in `spec.ts` flagged `stub: true` renders that boilerplate line. Either:
      a) flip `stub: false` on each entry and write real `description` + parameter docs + example responses, or
      b) hide the boilerplate entirely and just render the curl/JS examples that already exist for stubs.
    - Pass through every section (apps, vms, env, secrets, domains, cron, team, tokens, audit) and remove every stub placeholder so the docs read as a real reference.

24. **"Jump to" palette → full site search + quick actions.**
    - Promote it from page-jump-only to a real command palette (cmd-k style).
    - Sections:
      a) **Navigate** — every dashboard tab (Apps, Supabase Tables/SQL/Auth/Storage/Policies/Functions/Realtime/Connection, Domains, Backups, Health, Metrics, Team, API tokens, Audit, API docs, Settings).
      b) **Actions** — Create new app, Create env variable, Create secret, Add custom domain, Invite team member, Generate API token, Run backup now, Connect GitHub, New table, New RLS policy, New bucket, New function.
      c) **Resources** — fuzzy-match apps by name, env vars, secrets, domains, customers (for wcn_admin), team members, tokens.
    - Keep the existing keyboard shortcut to open it; results group by section with section labels.
