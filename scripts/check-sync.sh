#!/usr/bin/env bash
# Diagnose vault sync state across all layers.
# Run anytime: bash scripts/check-sync.sh

set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

VAULT="/Users/murali/BeBrain/bettroi-vault"
cd "$VAULT" || exit 1

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[33m⚠\033[0m %s\n' "$1"; }
err()  { printf '\033[31m✗\033[0m %s\n' "$1"; }

bold "1. Recent file edits in vault (last hour)"
RECENT=$(find . -type f -name "*.md" -newermt "1 hour ago" -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null)
if [[ -n "$RECENT" ]]; then
  ok "files edited recently:"
  echo "$RECENT" | sed 's/^/   /'
else
  warn "no .md edits in the last hour — Obsidian may be on a different vault, or edits not saved yet"
fi
echo

bold "2. Uncommitted local changes"
if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  ok "working tree clean — nothing pending"
else
  warn "uncommitted changes:"
  git status --short | sed 's/^/   /'
fi
echo

bold "3. Local vs remote (GitHub)"
git fetch origin main --quiet 2>&1
LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)
if [[ "$LOCAL" == "$REMOTE" ]]; then
  ok "local and remote at same commit: ${LOCAL:0:7}"
else
  warn "local: ${LOCAL:0:7} | remote: ${REMOTE:0:7}"
  AHEAD=$(git rev-list --count origin/main..main)
  BEHIND=$(git rev-list --count main..origin/main)
  [[ $AHEAD -gt 0 ]] && warn "you are $AHEAD commit(s) AHEAD of remote (push needed)"
  [[ $BEHIND -gt 0 ]] && warn "you are $BEHIND commit(s) BEHIND remote (pull needed)"
fi
echo

bold "4. Last 3 vault auto-syncs"
git log --oneline -3
echo

bold "5. LaunchAgent (10-min auto-push) status"
LA=$(launchctl list | grep co.bettroi.vault-sync || true)
if [[ -n "$LA" ]]; then
  EXIT_CODE=$(echo "$LA" | awk '{print $2}')
  if [[ "$EXIT_CODE" == "0" ]]; then
    ok "LaunchAgent loaded and last run succeeded"
  else
    err "LaunchAgent loaded but last exit code = $EXIT_CODE — check log"
  fi
else
  err "LaunchAgent not loaded — run: launchctl load -w ~/Library/LaunchAgents/co.bettroi.vault-sync.plist"
fi
echo

bold "6. Last 3 lines of auto-sync log"
tail -3 "$VAULT/scripts/auto-sync.log" 2>/dev/null | sed 's/^/   /' || warn "no log yet"
echo

bold "7. Last GitHub Actions run (vault → Supabase)"
if command -v gh >/dev/null 2>&1; then
  gh run list --repo chatgptnotes/bettroi-vault --workflow sync-vault-to-supabase --limit 1 \
    --json conclusion,createdAt,headBranch,event \
    --template '{{range .}}   conclusion: {{.conclusion}} | event: {{.event}} | at: {{.createdAt}}{{end}}'
  echo
else
  warn "gh CLI not found"
fi
echo

bold "Want to force a sync right now? Run:"
echo "   bash $VAULT/scripts/auto-sync.sh"
