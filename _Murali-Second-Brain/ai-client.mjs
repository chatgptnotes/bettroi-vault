// ai-client.mjs — Anthropic client with automatic VPS fallback
// Primary:  ANTHROPIC_API_KEY → direct Anthropic API
// Backup:   nexaproc-ai-gateway on Hostinger VPS (NEXAPROC_VPS_URL + NEXAPROC_VPS_KEY)
//           POST /api/invoke  taskID=GENERIC_ASK

import Anthropic from '@anthropic-ai/sdk';

const primary = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  // Vision/document calls must use the real Anthropic API (sidecar is text-only).
  if (hasNonTextContent(params)) return await primary.messages.create(params);

  // Text calls: prefer the Claude Code SUBSCRIPTION on the VPS (flat-rate, no API
  // credits — and the only path that works while the API balance is empty). Fall
  // back to the metered Anthropic API only if the sidecar is unreachable.
  try {
    return await callVPS(params);
  } catch (vpsErr) {
    console.warn(`  [ai-client] VPS sidecar unavailable (${(vpsErr.message || '').slice(0, 70)}) → Anthropic API`);
    try {
      return await primary.messages.create(params);
    } catch (anthropicErr) {
      if (isCreditsError(anthropicErr)) {
        // Anthropic credits exhausted. VPS is the only working path — wait 25s
        // for the bridge to free up, then try VPS one more time before giving up.
        anthropicCreditsExhausted = true;
        console.warn(`  [ai-client] Anthropic credits exhausted; waiting 25s for VPS to free up...`);
        await new Promise(r => setTimeout(r, 25000));
        return await callVPS(params); // throws if still busy — caller handles
      }
      throw anthropicErr;
    }
  }
}

export { primary as anthropic };
