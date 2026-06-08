// Vercel serverless function: receives DoubleTick "Message Received" webhooks and
// ingests the message text into the brain (brain_chunks), private to Murali.
//
// Security: DoubleTick has no request signing, so we gate on a secret in the URL
// query string — the webhook URL you register is .../api/doubletick-webhook?key=<WEBHOOK_SECRET>.
//
// Env vars to set in Vercel: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY, WEBHOOK_SECRET
//
// Payload ref: https://docs.doubletick.io/reference/webhooks (Message Received)

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (process.env.WEBHOOK_SECRET && req.query.key !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const p = req.body || {};
    const m = p.message || {};

    // Extract human-readable text from whatever message type arrived.
    let text = '';
    if (m.type === 'TEXT') text = m.text || '';
    else if (['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'].includes(m.type)) text = m.caption || '';
    else if (m.type === 'LOCATION') text = `Location: ${[m.name, m.address].filter(Boolean).join(' — ')}`;
    text = (text || '').trim();

    // Acknowledge (200) but skip ingesting empty/media-only messages — nothing searchable.
    if (text.length < 3) return res.status(200).json({ ok: true, skipped: 'no text content' });

    const sender = p.contact || p.from || 'unknown';
    const sourceRef = `whatsapp://doubletick/${p.messageId || p.dtMessageId}`;
    const content = `WhatsApp business message from ${sender}:\n\n${text}`;

    // Idempotent: drop any prior chunk for this exact message before inserting.
    await supabase.from('brain_chunks').delete().eq('source_ref', sourceRef);

    const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: content.slice(0, 8000) });
    const { error } = await supabase.from('brain_chunks').insert({
      project_tag: 'whatsapp-business',
      source_type: 'whatsapp',
      source_ref: sourceRef,
      content,
      embedding: emb.data[0].embedding,
      off_limits: true,                       // private to Murali
      metadata: { from: p.from, contact: p.contact, type: m.type, received_at: p.receivedAt },
    });
    if (error) { console.error('brain insert error:', error.message); return res.status(500).json({ error: error.message }); }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook error:', e);
    // Return 200 so DoubleTick doesn't enter a retry storm on a transient failure.
    return res.status(200).json({ ok: false, error: e.message });
  }
}
