#!/usr/bin/env bash
# Auto-sync the Bettroi vault to GitHub.
# Triggered by the LaunchAgent at ~/Library/LaunchAgents/co.bettroi.vault-sync.plist
# Runs every 10 minutes when the user is logged in.

set -uo pipefail

VAULT="/Users/murali/BeBrain/bettroi-vault"
LOG="$VAULT/scripts/auto-sync.log"

# Add common PATHs since launchd has a minimal env
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

cd "$VAULT" || { echo "$(date '+%F %T') ERROR: cannot cd to $VAULT" >> "$LOG"; exit 1; }

# Pull first so we don't push over remote changes
git pull --rebase --autostash origin main >> "$LOG" 2>&1 || {
  echo "$(date '+%F %T') WARN: pull failed, continuing" >> "$LOG"
}

# Stage everything (gitignore handles _scratch/, .DS_Store, etc.)
git add -A

# Bail if nothing changed
if git diff --cached --quiet; then
  echo "$(date '+%F %T') ok: no changes" >> "$LOG"
  exit 0
fi

# Commit + push
TS=$(date '+%F %T')
git -c commit.gpgsign=false commit -m "vault: auto-sync $TS" >> "$LOG" 2>&1
git push origin main >> "$LOG" 2>&1 && {
  echo "$TS pushed" >> "$LOG"
} || {
  echo "$TS ERROR: push failed" >> "$LOG"
  exit 1
}
