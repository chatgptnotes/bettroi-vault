# Auto-sync the bettroi-vault to GitHub from Windows.
# Counterpart to scripts/auto-sync.sh (macOS).
# Triggered every 5 min by Windows Task Scheduler task "BettroiVaultAutoSync".
# Runnable manually:  powershell -ExecutionPolicy Bypass -File scripts\auto-sync-windows.ps1

$ErrorActionPreference = "Continue"

$Vault = "C:\Users\HP\Documents\mfg-agent-vault"
$Log = Join-Path $Vault "scripts\auto-sync.log"
$MaxLogBytes = 512 * 1024  # 512 KB cap

# Rotate log if too big
if ((Test-Path $Log) -and ((Get-Item $Log).Length -gt $MaxLogBytes)) {
    Move-Item -Force $Log "$Log.1"
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') log rotated" | Out-File -FilePath $Log -Encoding utf8
}

function Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" | Out-File -FilePath $Log -Append -Encoding utf8
}

Set-Location $Vault
if (-not $?) {
    Log "ERROR: cannot cd to $Vault"
    exit 1
}

# Pull first so we don't push over remote changes
$pullOut = git pull --rebase --autostash origin main 2>&1
$pullOut | Out-File -FilePath $Log -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) {
    Log "WARN: pull failed, continuing"
}

# Stage everything (gitignore handles _scratch/, log files, etc.)
git add -A 2>&1 | Out-File -FilePath $Log -Append -Encoding utf8

# Bail if nothing changed
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Log "ok: no changes"
    exit 0
}

# Commit + push
$TS = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
git -c commit.gpgsign=false commit -m "vault: auto-sync $TS (windows)" 2>&1 | Out-File -FilePath $Log -Append -Encoding utf8

$pushOut = git push origin main 2>&1
$pushOut | Out-File -FilePath $Log -Append -Encoding utf8
if ($LASTEXITCODE -eq 0) {
    Log "pushed"
    exit 0
}

Log "ERROR: push failed"
exit 1
