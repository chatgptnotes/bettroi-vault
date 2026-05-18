// ai-client.mjs — Anthropic client with automatic VPS backup
// Primary: ANTHROPIC_API_KEY (direct Anthropic API)
// Backup:  ANTHROPIC_BASE_URL_BACKUP + ANTHROPIC_API_KEY_BACKUP (nexaproc-ai-gateway on Hostinger VPS)
//
// Set in .env.local:
//   ANTHROPIC_BASE_URL_BACKUP=https://your-vps-domain/api/anthropic
//   ANTHROPIC_API_KEY_BACKUP=your-vps-gateway-key   (or same key if gateway forwards it)

import Anthropic from '@anthropic-ai/sdk';

const primary = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const backup = (process.env.ANTHROPIC_BASE_URL_BACKUP)
  ? new Anthropic({
      baseURL: process.env.ANTHROPIC_BASE_URL_BACKUP,
      apiKey: process.env.ANTHROPIC_API_KEY_BACKUP || process.env.ANTHROPIC_API_KEY || 'not-needed',
    })
  : null;

function isCreditsError(e) {
  return e.status === 402
    || /credit|balance|insufficient|quota|billing/i.test(e.message || '');
}

export async function callClaude(params) {
  try {
    return await primary.messages.create(params);
  } catch (e) {
    if (backup && isCreditsError(e)) {
      console.warn('  [ai-client] primary credits exhausted → VPS backup');
      return await backup.messages.create(params);
    }
    throw e;
  }
}

export { primary as anthropic };
