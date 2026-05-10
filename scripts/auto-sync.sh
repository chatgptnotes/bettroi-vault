#!/usr/bin/env bash
# Auto-sync the Bettroi vault to GitHub.
# Triggered every 10 min by ~/Library/LaunchAgents/co.bettroi.vault-sync.plist
# OR runnable manually: bash scripts/auto-sync.sh

set -uo pipefail

VAULT="/Users/murali/BeBrain/bettroi-vault"
LOG="$VAULT/scripts/auto-sync.log"
MAX_LOG_BYTES=$((512 * 1024))   # 512 KB cap

# Add common PATHs since launchd has a minimal env
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# Rotate log if too big
if [[ -f "$LOG" ]] && [[ $(wc -c < "$LOG" | tr -d ' ') -gt $MAX_LOG_BYTES ]]; then
  mv "$LOG" "${LOG}.1"
  echo "$(date '+%F %T') log rotated" > "$LOG"
fi

cd "$VAULT" || { echo "$(date '+%F %T') ERROR: cannot cd to $VAULT" >> "$LOG"; exit 1; }

# Pull first so we don't push over remote changes
git pull --rebase --autostash origin main >> "$LOG" 2>&1 || {
  echo "$(date '+%F %T') WARN: pull failed, continuing" >> "$LOG"
}

# Stage everything (gitignore handles _scratch/, .DS_Store, log files, etc.)
git add -A

# Bail if nothing changed
if git diff --cached --quiet; then
  echo "$(date '+%F %T') ok: no changes" >> "$LOG"
  exit 0
fi

# Commit + push
TS=$(date '+%F %T')
git -c commit.gpgsign=false commit -m "vault: auto-sync $TS" >> "$LOG" 2>&1
if git push origin main >> "$LOG" 2>&1; then
  echo "$TS pushed" >> "$LOG"
  exit 0
fi

# Push failed — try to notify Slack if webhook is set in env
echo "$TS ERROR: push failed" >> "$LOG"
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"text\":\"⚠️ vault auto-sync push failed at $TS — check $LOG\"}" \
    "$SLACK_WEBHOOK_URL" >> "$LOG" 2>&1 || true
fi
exit 1
