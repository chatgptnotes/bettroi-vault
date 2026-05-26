# Brain Fathom Webhook — Vercel Deploy

When a Fathom meeting ends, Fathom POSTs to `https://<your-app>.vercel.app/api/fathom`.
This handler classifies it, commits a `.md` note to your vault repo, and notifies you in Slack.

## One-time deploy (3 minutes)

1. **Install Vercel CLI** (if not already):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from this folder:**
   ```bash
   cd /Users/murali/BeBrain/bettroi-vault/_Murali-Second-Brain/webhook
   vercel
   ```
   - Sign in if prompted (link to your Vercel account)
   - Project name: `brain-webhook` (or whatever)
   - Settings: accept defaults
   - It prints a URL like `https://brain-webhook-xxx.vercel.app`

3. **Set the env vars in Vercel** (Settings → Environment Variables for the deployed project):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ANTHROPIC_API_KEY`
   - `SLACK_BOT_TOKEN`
   - `SLACK_MURALI_USER_ID`
   - `FATHOM_WEBHOOK_SECRET`
   - `GITHUB_TOKEN` — create at github.com/settings/tokens (scope: `repo`)

4. **Redeploy with the env vars:**
   ```bash
   vercel --prod
   ```

5. **Configure Fathom**:
   - Fathom Settings → API Access → Webhook URL
   - Paste your Vercel URL: `https://brain-webhook-xxx.vercel.app/api/fathom`
   - Save

Done. Every new Fathom meeting will now:
- Auto-classify into a project folder
- Commit a `.md` note to GitHub
- Trigger the obsidian-sync workflow → brain ingests it
- Post a Slack notification to your DM

## How it routes

| Confidence | Action |
|---|---|
| ≥ 0.6 + folder exists | Auto-files to that folder |
| < 0.6 or unknown folder | Files to `_Fathom-Inbox/` for manual review |

You can always move the `.md` file to a different folder in Obsidian — the next obsidian-sync run picks up the new location and re-files in the brain.
