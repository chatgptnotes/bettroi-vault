// ai-client.mjs — Claude client with local-CLI-first routing
// Primary:  local `claude` CLI on the Max-plan subscription, pinned to Haiku
//           (flat-rate). ANTHROPIC_API_KEY is stripped from the child env so the
//           CLI authenticates via OAuth, NOT the metered API key. (See harvested
//           skill: "Claude CLI: ANTHROPIC_API_KEY env silently overrides OAuth".)
// Backup:   direct Anthropic API (metered) via ANTHROPIC_API_KEY.
// Optional: nexaproc-ai-gateway only when BRAIN_ALLOW_NEXAPROC_VPS=true.
import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'node:child_process';

const primary = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Model the local CLI is pinned to (override via BRAIN_CLAUDE_MODEL).
const LOCAL_CLAUDE_MODEL = process.env.BRAIN_CLAUDE_MODEL || 'claude-haiku-4-5';
const ALLOW_NEXAPROC_VPS = process.env.BRAIN_ALLOW_NEXAPROC_VPS === 'true';

// Live-binding flag — set true when Anthropic returns a credits/billing error.
// Callers can read this to decide whether to alert the user.
export let anthropicCreditsExhausted = false;

function isCreditsError(e) {
  return e.status === 402
    || /credit|balance|insufficient|quota|billing/i.test(e.message || '');
}

// Flatten Anthropic messages.create params into a plain text prompt for GENERIC_ASK
function toPlainPrompt({ system, messages }) {
  const parts = [];
  if (system) parts.push(`[System]\n${system}`);
  for (const m of (messages || [])) {
    const role = m.role === 'user' ? 'User' : 'Assistant';
    const text = Array.isArray(m.content)
      ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      : m.content;
    parts.push(`[${role}]\n${text}`);
  }
  return parts.join('\n\n');
}

// Call nexaproc-ai-gateway and return an Anthropic-SDK-compatible response shape.
// Retries up to 3 times on 429 (bridge busy) with 8s backoff — the VPS is single-flight.
async function callVPS(params, attempt = 0) {
  const url = process.env.NEXAPROC_VPS_URL;
  const key = process.env.NEXAPROC_VPS_KEY;
  if (!url || !key) throw new Error('NEXAPROC_VPS_URL / NEXAPROC_VPS_KEY not set in .env.local');

  const prompt = toPlainPrompt(params);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nexaproc-Key': key,
    },
    body: JSON.stringify({ taskID: 'GENERIC_ASK', payload: prompt, useJson: false }),
  });

  if (resp.status === 429 && attempt < 3) {
    const wait = (attempt + 1) * 8000;
    console.warn(`  [ai-client] VPS busy, retrying in ${wait / 1000}s (attempt ${attempt + 1}/3)`);
    await new Promise(r => setTimeout(r, wait));
    return callVPS(params, attempt + 1);
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`nexaproc VPS ${resp.status}: ${body.slice(0, 120)}`);
  }

  const data = await resp.json();
  if (!data.ok) throw new Error(`nexaproc error: ${data.error || JSON.stringify(data)}`);

  // Return shape compatible with Anthropic SDK so all callers work unchanged
  return {
    content: [{ type: 'text', text: data.stdout ?? '' }],
    model: 'claude-via-vps',
    usage: { input_tokens: data.tokensIn ?? 0, output_tokens: data.tokensOut ?? 0 },
  };
}

// Run the local `claude` CLI in headless print mode, pinned to Haiku, on the
// Max-plan subscription. Returns an Anthropic-SDK-compatible response shape.
// The prompt is piped via stdin; ANTHROPIC_* API creds are removed from the
// child env so the CLI uses OAuth (subscription) rather than the metered key.
function callLocalClaude(params, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const prompt = toPlainPrompt(params);
    const env = { ...process.env, HOME: process.env.HOME || '/root' };
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;
    delete env.ANTHROPIC_BASE_URL;

    const args = ['-p', '--model', LOCAL_CLAUDE_MODEL, '--output-format', 'json'];
    const child = spawn('claude', args, { env, stdio: ['pipe', 'pipe', 'pipe'] });

    let out = '', err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`local claude CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`claude CLI exit ${code}: ${err.slice(0, 150)}`));
      let envelope;
      try { envelope = JSON.parse(out); }
      catch { return reject(new Error(`claude CLI parse fail: ${(out || err).slice(0, 150)}`)); }
      if (envelope.is_error) return reject(new Error(`claude CLI error: ${String(envelope.result).slice(0, 150)}`));
      const u = envelope.usage || {};
      resolve({
        content: [{ type: 'text', text: envelope.result ?? '' }],
        model: `claude-cli-${LOCAL_CLAUDE_MODEL}`,
        usage: { input_tokens: u.input_tokens ?? 0, output_tokens: u.output_tokens ?? 0 },
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Does this request carry non-text content (images / documents)? Those can't go
// through the CLI sidecar (bridge.ts flattens messages to a text prompt), so they
// must use the real API.
function hasNonTextContent(params) {
  for (const m of params.messages || []) {
    if (Array.isArray(m.content) && m.content.some(b => b.type && b.type !== 'text')) return true;
  }
  return false;
}

export async function callClaude(params) {
  // Vision/document calls must use the real Anthropic API (CLI/gateway are text-only).
  if (hasNonTextContent(params)) return await primary.messages.create(params);

  // Text calls, in order of preference:
  //   1. local `claude` CLI on the Max-plan subscription, pinned to Haiku (flat-rate)
  //   2. metered Anthropic API
  //   3. optional nexaproc-ai-gateway only when explicitly enabled
  try {
    return await callLocalClaude(params);
  } catch (cliErr) {
    console.warn(`  [ai-client] local Haiku CLI unavailable (${(cliErr.message || '').slice(0, 70)}) → Anthropic API`);
    try {
      return await primary.messages.create(params);
    } catch (anthropicErr) {
      if (isCreditsError(anthropicErr)) {
        anthropicCreditsExhausted = true;
        if (ALLOW_NEXAPROC_VPS) {
          console.warn(`  [ai-client] Anthropic credits exhausted → explicitly enabled Nexaproc VPS gateway`);
          return await callVPS(params);
        }
        // Anthropic credits exhausted — the local CLI subscription is the only
        // default non-VPS path. Wait briefly, then try the CLI once more.
        console.warn(`  [ai-client] Anthropic credits exhausted; Nexaproc VPS disabled; retrying local Haiku CLI...`);
        await new Promise(r => setTimeout(r, 5000));
        return await callLocalClaude(params);
      }
      throw anthropicErr;
    }
  }
}

export { primary as anthropic };
