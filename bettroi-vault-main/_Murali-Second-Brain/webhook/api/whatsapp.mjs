// /api/whatsapp — Twilio WhatsApp webhook
// Receives incoming WhatsApp messages, ingests into brain, optionally replies.

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Verify Twilio signature so randos can't post fake messages
function verifyTwilio(req, twilioAuthToken) {
  const signature = req.headers['x-twilio-signature'];
  if (!signature || !twilioAuthToken) return false;
  const url = `https://${req.headers.host}${req.url}`;
  const params = Object.keys(req.body).sort().map(k => k + req.body[k]).join('');
  const data = url + params;
  const expected = crypto.createHmac('sha1', twilioAuthToken).update(data).digest('base64');
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); }
  catch { return false; }
}

async function ingestText({ text, project_tag, source_type, source_ref, metadata }) {
  // Simple ingest — chunk + embed via OpenAI, insert to brain_chunks
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const chunks = text.replace(/\x00/g, '').match(/.{1,2048}/gs) || [text];
  const embed = await openai.embeddings.create({ model: 'text-embedding-3-small', input: chunks });
  const rows = chunks.map((content, i) => ({
    project_tag, source_type, source_ref, content,
    embedding: embed.data[i].embedding,
    off_limits: true,  // WhatsApp is personal, off-limits to team
    metadata,
  }));
  await supabase.from('brain_chunks').insert(rows);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Verify Twilio signature
  if (process.env.TWILIO_AUTH_TOKEN && !verifyTwilio(req, process.env.TWILIO_AUTH_TOKEN)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  const from = req.body.From || 'unknown';       // e.g. "whatsapp:+919876543210"
  const to = req.body.To || 'unknown';
  const body = req.body.Body || '';
  const profileName = req.body.ProfileName || from.replace('whatsapp:', '');
  const msgSid = req.body.MessageSid || `tw-${Date.now()}`;

  // Check for prefix to extract project tag
  const prefixMatch = body.match(/^\[([^\]]+)\]/);
  const project_tag = prefixMatch ? prefixMatch[1] : 'whatsapp';
  const content = prefixMatch ? body.slice(prefixMatch[0].length).trim() : body;

  if (content.length < 5) {
    // Reply with help
    return res.setHeader('Content-Type', 'text/xml').status(200).send(
      `<Response><Message>🧠 Brain ready. Send any message to capture. Prefix with [Project] to file under that project, e.g. [AdamritHMS] reminder to follow up on billing</Message></Response>`
    );
  }

  // Ingest
  try {
    await ingestText({
      text: `WhatsApp from ${profileName}:\n\n${content}`,
      project_tag: project_tag.toLowerCase().replace(/\s+/g, '-'),
      source_type: 'whatsapp',
      source_ref: `whatsapp://${msgSid}`,
      metadata: { date: new Date().toISOString(), from, profile_name: profileName, sid: msgSid },
    });
  } catch (e) {
    console.error('WhatsApp ingest failed:', e);
    return res.setHeader('Content-Type', 'text/xml').status(200).send(
      `<Response><Message>⚠ Capture failed: ${e.message}</Message></Response>`
    );
  }

  // Send confirmation
  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(
    `<Response><Message>✅ Captured to brain → \`${project_tag}\`. ${content.length} chars saved.</Message></Response>`
  );
}
