# LLM Provider Switcher for Claude Code

Quick aliases to switch between Anthropic, GLM (Z.AI), and DeepSeek when using Claude Code.

## What It Does

- `use-anthropic` — Switch to Anthropic (default)
- `use-glm` — Switch to GLM (Z.AI)
- `use-deepseek` — Switch to DeepSeek
- `use-current` — Show current provider

## Prerequisites

1. **Claude Code installed** on your machine
2. **API Keys** (get these before proceeding):
   - **GLM (Z.AI)**: https://z.ai/manage-apikey/apikey-list
   - **DeepSeek**: https://platform.deepseek.com/api_keys
   - **Anthropic**: Works with your existing Claude Code login (no key needed)

## Installation

### Mac / Linux (zsh)

```bash
# 1. Create the switcher script
cat > ~/.claude-backend-toggle.sh << 'EOF'
export DEEPSEEK_API_KEY="PASTE_YOUR_DEEPSEEK_KEY_HERE"
export GLM_API_KEY="PASTE_YOUR_GLM_KEY_HERE"

use-anthropic() {
  unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN
  unset ANTHROPIC_DEFAULT_OPUS_MODEL ANTHROPIC_DEFAULT_SONNET_MODEL ANTHROPIC_DEFAULT_HAIKU_MODEL
  echo "✓ Switched to Anthropic (default)"
}

use-glm() {
  export ANTHROPIC_BASE_URL="https://api.z.ai/api/anthropic"
  export ANTHROPIC_AUTH_TOKEN="$GLM_API_KEY"
  export ANTHROPIC_DEFAULT_OPUS_MODEL="GLM-4.7"
  export ANTHROPIC_DEFAULT_SONNET_MODEL="GLM-4.7"
  export ANTHROPIC_DEFAULT_HAIKU_MODEL="GLM-4.5-Air"
  echo "✓ Switched to GLM (Z.AI)"
}

use-deepseek() {
  export ANTHROPIC_BASE_URL="https://api.deepseek.com"
  export ANTHROPIC_AUTH_TOKEN="$DEEPSEEK_API_KEY"
  export ANTHROPIC_DEFAULT_OPUS_MODEL="deepseek-chat"
  export ANTHROPIC_DEFAULT_SONNET_MODEL="deepseek-chat"
  export ANTHROPIC_DEFAULT_HAIKU_MODEL="deepseek-chat"
  echo "✓ Switched to DeepSeek"
}

use-current() {
  if [ -z "$ANTHROPIC_BASE_URL" ]; then
    echo "Current: Anthropic (default)"
  else
    echo "Current: $ANTHROPIC_BASE_URL"
    echo "Model: $ANTHROPIC_DEFAULT_SONNET_MODEL"
  fi
}
EOF

# 2. Add your API keys (replace the placeholders)
nano ~/.claude-backend-toggle.sh
# Save: Ctrl+X, Y, Enter

# 3. Add to .zshrc
echo 'source ~/.claude-backend-toggle.sh' >> ~/.zshrc

# 4. Reload your shell
source ~/.zshrc
```

### Windows (PowerShell)

```powershell
# 1. Create the switcher script in your home directory
$scriptPath = "$env:USERPROFILE\.claude-backend-toggle.ps1"
@'
$env:DEEPSEEK_API_KEY = "PASTE_YOUR_DEEPSEEK_KEY_HERE"
$env:GLM_API_KEY = "PASTE_YOUR_GLM_KEY_HERE"

function use-anthropic {
    Remove-Item Env:ANTHROPIC_BASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:ANTHROPIC_DEFAULT_OPUS_MODEL -ErrorAction SilentlyContinue
    Remove-Item Env:ANTHROPIC_DEFAULT_SONNET_MODEL -ErrorAction SilentlyContinue
    Remove-Item Env:ANTHROPIC_DEFAULT_HAIKU_MODEL -ErrorAction SilentlyContinue
    Write-Host "✓ Switched to Anthropic (default)" -ForegroundColor Green
}

function use-glm {
    $env:ANTHROPIC_BASE_URL = "https://api.z.ai/api/anthropic"
    $env:ANTHROPIC_AUTH_TOKEN = $env:GLM_API_KEY
    $env:ANTHROPIC_DEFAULT_OPUS_MODEL = "GLM-4.7"
    $env:ANTHROPIC_DEFAULT_SONNET_MODEL = "GLM-4.7"
    $env:ANTHROPIC_DEFAULT_HAIKU_MODEL = "GLM-4.5-Air"
    Write-Host "✓ Switched to GLM (Z.AI)" -ForegroundColor Green
}

function use-deepseek {
    $env:ANTHROPIC_BASE_URL = "https://api.deepseek.com"
    $env:ANTHROPIC_AUTH_TOKEN = $env:DEEPSEEK_API_KEY
    $env:ANTHROPIC_DEFAULT_OPUS_MODEL = "deepseek-chat"
    $env:ANTHROPIC_DEFAULT_SONNET_MODEL = "deepseek-chat"
    $env:ANTHROPIC_DEFAULT_HAIKU_MODEL = "deepseek-chat"
    Write-Host "✓ Switched to DeepSeek" -ForegroundColor Green
}

function use-current {
    if ($env:ANTHROPIC_BASE_URL) {
        Write-Host "Current: $($env:ANTHROPIC_BASE_URL)"
        Write-Host "Model: $($env:ANTHROPIC_DEFAULT_SONNET_MODEL)"
    } else {
        Write-Host "Current: Anthropic (default)"
    }
}
'@ | Out-File -FilePath $scriptPath -Encoding UTF8

# 2. Add your API keys (edit the file)
notepad $scriptPath

# 3. Add to PowerShell profile
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}
Add-Content -Path $PROFILE -Value ". `$scriptPath"

# 4. Reload your profile
. $PROFILE
```

### Linux VPS / Server

```bash
# Follow the Mac/Linux instructions above
# Use .bashrc instead of .zshrc if your shell is bash
echo 'source ~/.claude-backend-toggle.sh' >> ~/.bashrc
source ~/.bashrc
```

## How to Use

```bash
# Switch to GLM (Z.AI)
use-glm

# Switch to DeepSeek
use-deepseek

# Switch back to Anthropic (default)
use-anthropic

# Check current provider
use-current
```

Then run Claude Code normally — it will use the selected provider.

## Example Workflow

```bash
# Use cost-effective GLM for coding tasks
use-glm
claude "help me refactor this function"

# Switch to Anthropic for sensitive tasks
use-anthropic
claude "review this for security issues"

# Check what's active
use-current
```

## Provider Comparison

| Provider | Best For | Cost | Speed |
|----------|----------|------|-------|
| **Anthropic** | Sensitive data, production | Higher | Fast |
| **GLM (Z.AI)** | General coding, drafts | Lower | Fast |
| **DeepSeek** | Quick iterations | Lowest | Very Fast |

## Troubleshooting

**"command not found" errors**
- Make sure you ran `source ~/.zshrc` (Mac/Linux) or `. $PROFILE` (Windows)
- Restart your terminal

**API errors**
- Verify your API keys are correct
- Check that you have active subscriptions/quota

**Provider not switching**
- Run `use-current` to check current settings
- Make sure the script is sourced in your shell config

## Security Notes

- API keys are stored in **plaintext** in `~/.claude-backend-toggle.sh`
- Keep this file private (`chmod 600 ~/.claude-backend-toggle.sh`)
- Don't commit this file to version control
- Add to `.gitignore`: `echo ".claude-backend-toggle.*" >> ~/.gitignore`

## Getting API Keys

### GLM (Z.AI)
1. Go to https://z.ai
2. Sign up/login
3. Navigate to https://z.ai/manage-apikey/apikey-list
4. Create API key
5. Copy key

### DeepSeek
1. Go to https://platform.deepseek.com
2. Sign up/login
3. Navigate to https://platform.deepseek.com/api_keys
4. Create API key
5. Copy key

## Need Help?

- Check Claude Code docs: https://code.claude.com/docs
- Team slack: #claude-code-support
