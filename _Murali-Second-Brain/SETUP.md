# Second Brain — Setup & Operation

This is the day-to-day operating doc for your second brain.
The strategy doc is in `PLAN.md`. The schema is in `schema.sql`.

---

## What's running right now

| Component | Status | Where |
|---|---|---|
| Supabase `brain_chunks` table | ✅ Live | Supabase dashboard |
| Obsidian → brain ingest | ✅ Working | `npm run brain:obsidian` |
| Slack bot `@Bettroi` (Phase B) | ✅ Live (locally) | `npm run brain:bot` |
| "Send to Brain" message shortcut | ✅ Live | Right-click any Slack message |
| `#brain-inbox` ingest | ✅ Live | Type or drop image with `[Project]` prefix |
| Morning digest (Phase C) | ✅ Built | `npm run brain:digest` |
| Role-based access (Phase D) | ✅ Built | `brain_user_roles` table |
| Fathom backfill | ⏳ Awaiting your review of `FATHOM-REVIEW.md` |
| Fathom auto-ingest going forward | ⏸ Webhook code drafted, not deployed |

---

## Daily commands

```bash
# Ask the brain anything (from terminal)
npm run brain:ask "what did I decide about AdamritHMS billing?"

# Re-ingest changed vault notes
npm run brain:obsidian

# Generate morning digest manually
npm run brain:digest        # posts to your Slack DM
npm run brain:digest -- --dry   # preview without posting

# Start Slack bot (currently runs in this terminal)
npm run brain:bot
```

---

## Keep the bot running on your Mac

Right now `npm run brain:bot` runs as a foreground process. To keep it
running after you close terminal, use `launchd`. Create:

`~/Library/LaunchAgents/com.murali.brain-bot.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>          <string>com.murali.brain-bot</string>
  <key>WorkingDirectory</key> <string>/Users/murali/BeBrain/bettroi-vault</string>
  <key>ProgramArguments</key>
    <array>
      <string>/usr/local/bin/node</string>
      <string>--env-file=.env.local</string>
      <string>_Murali-Second-Brain/slack-bot.mjs</string>
    </array>
  <key>RunAtLoad</key>      <true/>
  <key>KeepAlive</key>      <true/>
  <key>StandardOutPath</key><string>/tmp/brain-bot.out.log</string>
  <key>StandardErrorPath</key><string>/tmp/brain-bot.err.log</string>
</dict>
</plist>
```

Then:
```bash
launchctl load ~/Library/LaunchAgents/com.murali.brain-bot.plist
```

Bot now restarts automatically on Mac reboot or crash.

---

## Schedule the morning digest (GitHub Actions, cloud)

The workflow `.github/workflows/brain-morning-digest.yml` is already in your repo.
It runs daily at 07:30 IST. To activate it, add these as **GitHub Actions
secrets** (Settings → Secrets and variables → Actions → New repository secret):

| Secret name | Value (copy from .env.local) |
|---|---|
| `BRAIN_SUPABASE_URL` | `SUPABASE_URL` |
| `BRAIN_SUPABASE_SERVICE_KEY` | `SUPABASE_SERVICE_KEY` |
| `BRAIN_SLACK_BOT_TOKEN` | `SLACK_BOT_TOKEN` |
| `BRAIN_SLACK_MURALI_USER_ID` | `SLACK_MURALI_USER_ID` |
| `BRAIN_ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` |
| `BRAIN_OPENAI_API_KEY` | `OPENAI_API_KEY` |

Once secrets are set, you can also trigger manually:
GitHub → Actions tab → "Brain — Morning Digest" → Run workflow.

The `.github/workflows/brain-obsidian-sync.yml` workflow auto-ingests vault
changes into the brain on every push.

---

## Onboarding team members (Phase D)

Brain has 3 access roles already defined in `brain_access_roles`:

| Role | Allowed projects | Blocked tags |
|---|---|---|
| `murali` | all | none |
| `coo` | all | hr, salary, accounts, payments, private |
| `sales_lead` | adamrit, hope, 2men, client | hr, salary, accounts, payments, private, internal |

To grant access to a team member:

1. Get their Slack member ID (Slack profile → ⋯ → Copy member ID)
2. Run in Supabase SQL editor:
   ```sql
   insert into brain_user_roles (slack_user_id, display_name, role) values
     ('U01ABCDEFGH', 'Caroline (COO)', 'coo');
   ```
3. Restart the bot (it caches nothing — next query picks it up immediately)

Anyone not in `brain_user_roles` and not you gets `public` role → bot replies
"You don't have access. Ask Murali."

---

## Off-limits content (Phase D safety)

Two layers protect sensitive content:

**Layer 1 — Folder auto-flag**: Any Obsidian note in a folder named `_private`,
`HR`, `Accounts`, `Finance`, or `Salary` gets `off_limits=true` automatically
when ingested. Team queries can never retrieve these chunks.

**Layer 2 — Slack thread tagging**: Add `[Private]` to a `#brain-inbox` message
to flag it off-limits.

Murali (you) always see everything — the off-limits flag only filters team
queries.

---

## Fathom going forward

The 41 historical meetings are in `fathom-backfill-data.json`, awaiting your
review in `FATHOM-REVIEW.md`. Once you finish that:

```bash
npm run brain:fathom-apply    # writes notes to chosen folders
npm run brain:obsidian        # ingests them into brain
```

For NEW meetings going forward, two paths:

**Option A — Periodic manual pull (until webhook is live)**:
In Claude Code, ask: *"Pull my latest Fathom meetings and add them to fathom-backfill-data.json for review"*. Claude can use the Fathom MCP to fetch and append. Then re-run the review/apply flow.

**Option B — Fathom webhook (one-time deploy)**:
Build a small Next.js app, deploy to Vercel, configure the webhook URL in
Fathom settings. Meetings auto-post to `#brain-inbox` with classifier
suggestions for one-click approval.

---

## Maintenance

```sql
-- See what's in the brain
select project_tag, count(*) from brain_chunks group by 1 order by 2 desc;

-- Clear test/junk chunks
delete from brain_chunks where source_type = 'test';

-- Reset Fathom sync state to re-pull everything
update brain_sync_state set last_synced = '1970-01-01' where source = 'fathom';
```

---

## Files in this folder

| File | Purpose |
|---|---|
| `PLAN.md` | Strategic plan (immutable reference) |
| `SETUP.md` | This file — day-to-day ops |
| `schema.sql` | Run once in Supabase to create tables + indexes |
| `team-roles.sql` | Run when adding team members |
| `ingest.mjs` | Core chunk + embed + insert function |
| `obsidian-sync.mjs` | Walks the vault, ingests changed .md files |
| `query.mjs` | RAG query (vector search + Claude synthesis) |
| `slack-bot.mjs` | Live Slack bot (Phase B + Phase D) |
| `digest.mjs` | Morning digest (Phase C) |
| `fathom-review.mjs` | Generate FATHOM-REVIEW.md for human approval |
| `fathom-apply.mjs` | Write approved meetings to project folders |
| `fathom-backfill-data.json` | Raw Fathom meeting data (50 meetings) |
| `FATHOM-REVIEW.md` | **You edit this** to classify meetings |
