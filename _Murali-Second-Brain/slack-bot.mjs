// slack-bot.mjs — @brain Slack bot via Socket Mode (no server needed)
// Usage: node --env-file=.env.local _Murali-Second-Brain/slack-bot.mjs

import { App } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';
import { queryBrain } from './query.mjs';
import { ingestText } from './ingest.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const BRAIN_INBOX = process.env.SLACK_BRAIN_INBOX_CHANNEL_ID;
const MURALI_ID   = process.env.SLACK_MURALI_USER_ID;

// Role lookup by Slack user ID
const ROLE_MAP = {
  [MURALI_ID]: 'murali',
  // Add COO / Sales Lead Slack user IDs here when ready:
  // 'UXXXXXXXX': 'coo',
  // 'UXXXXXXXX': 'sales_lead',
};

const app = new App({
  token:     process.env.SLACK_BOT_TOKEN,
  appToken:  process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

// ── Phase B: Answer questions via DM or @brain mention ───────────────────────

app.event('app_mention', async ({ event, say }) => {
  const question = event.text.replace(/<@[^>]+>/g, '').trim();
  if (!question) { await say('Ask me anything about your projects!'); return; }

  await say({ text: '_Thinking..._', thread_ts: event.ts });
  const role = ROLE_MAP[event.user] ?? 'murali';

  try {
    const { answer, sources } = await queryBrain({ question, role });
    const sourceList = sources.slice(0, 3).map((s, i) => `[${i+1}] ${s}`).join('\n');
    await say({
      text: `${answer}\n\n*Sources:*\n${sourceList}`,
      thread_ts: event.ts,
    });
  } catch (err) {
    await say({ text: `Error: ${err.message}`, thread_ts: event.ts });
  }
});

app.event('message', async ({ event, client }) => {
  // DM to bot
  if (event.channel_type !== 'im' || event.bot_id) return;
  const question = event.text?.trim();
  if (!question) return;

  const role = ROLE_MAP[event.user] ?? 'murali';
  await client.chat.postMessage({ channel: event.channel, text: '_Thinking..._' });

  try {
    const { answer, sources } = await queryBrain({ question, role });
    const sourceList = sources.slice(0, 3).map((s, i) => `[${i+1}] ${s}`).join('\n');
    await client.chat.postMessage({
      channel: event.channel,
      text: `${answer}\n\n*Sources:*\n${sourceList}`,
    });
  } catch (err) {
    await client.chat.postMessage({ channel: event.channel, text: `Error: ${err.message}` });
  }
});

// ── #brain-inbox: ingest new messages ────────────────────────────────────────

app.event('message', async ({ event }) => {
  if (event.channel !== BRAIN_INBOX || event.bot_id || event.subtype) return;

  const text = event.text ?? '';
  const prefixMatch = text.match(/^\[([^\]]+)\]/);
  const project_tag = prefixMatch ? prefixMatch[1] : '_inbox';
  const content = prefixMatch ? text.slice(prefixMatch[0].length).trim() : text;

  // Handle image attachments (diary photos) — download + OCR via Claude Vision
  if (event.files?.length) {
    for (const file of event.files) {
      if (!file.mimetype?.startsWith('image/')) continue;
      try {
        const imgRes = await fetch(file.url_private, {
          headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }
        });
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const ocr = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: file.mimetype, data: base64 } },
              { type: 'text', text: 'Extract all text from this image exactly as written. Output only the extracted text.' }
            ]
          }]
        });
        const ocrText = ocr.content[0].text;
        if (ocrText.length > 20) {
          await ingestText({ text: ocrText, project_tag, source_type: 'diary', source_ref: file.permalink ?? file.id, metadata: { date: new Date().toISOString() } });
        }
      } catch (e) {
        console.error('OCR failed:', e.message);
      }
    }
  }

  // Ingest text content
  if (content.length > 10) {
    await ingestText({ text: content, project_tag, source_type: 'slack', source_ref: `slack://${event.channel}/${event.ts}`, metadata: { date: new Date().toISOString() } });
  }
});

// ── "Send to Brain" message shortcut ─────────────────────────────────────────
// Right-click any message → Send to Brain → ingests the full thread

app.shortcut('send_to_brain', async ({ shortcut, ack, client, respond }) => {
  await ack();

  const channelId = shortcut.channel.id;
  const messageTs = shortcut.message.ts;
  const threadTs  = shortcut.message.thread_ts ?? messageTs;

  try {
    // Pull the full thread (parent + all replies)
    const replies = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: 200,
    });

    if (!replies.messages?.length) {
      await client.chat.postEphemeral({
        channel: channelId, user: shortcut.user.id,
        text: '⚠ Could not read this thread (bot may not be in this channel).',
      });
      return;
    }

    // Resolve user IDs to names for readability
    const userCache = new Map();
    async function nameFor(uid) {
      if (!uid) return 'unknown';
      if (userCache.has(uid)) return userCache.get(uid);
      try {
        const r = await client.users.info({ user: uid });
        const name = r.user.real_name ?? r.user.name ?? uid;
        userCache.set(uid, name);
        return name;
      } catch { return uid; }
    }

    // Get channel name + permalink for source ref
    let channelName = channelId;
    try {
      const info = await client.conversations.info({ channel: channelId });
      channelName = info.channel.name ?? channelId;
    } catch {}

    const permalinkRes = await client.chat.getPermalink({ channel: channelId, message_ts: threadTs });
    const permalink = permalinkRes.permalink ?? `slack://${channelId}/${threadTs}`;

    // Format the thread as text
    const lines = [`Slack thread from #${channelName}`, `Link: ${permalink}`, ''];
    for (const m of replies.messages) {
      const author = await nameFor(m.user);
      const ts = new Date(parseFloat(m.ts) * 1000).toISOString();
      lines.push(`[${ts}] ${author}: ${m.text ?? '(no text)'}`);
    }
    const text = lines.join('\n');

    // Extract project tag from parent message if it has [Prefix]
    const parentText = replies.messages[0].text ?? '';
    const prefixMatch = parentText.match(/^\[([^\]]+)\]/);
    const project_tag = prefixMatch ? prefixMatch[1] : `slack-${channelName}`;

    await ingestText({
      text,
      project_tag,
      source_type: 'slack-thread',
      source_ref: permalink,
      metadata: {
        channel: channelName,
        thread_ts: threadTs,
        message_count: replies.messages.length,
        date: new Date().toISOString(),
      },
    });

    await client.chat.postEphemeral({
      channel: channelId, user: shortcut.user.id,
      text: `✅ Ingested ${replies.messages.length} message(s) from #${channelName} → filed under \`${project_tag}\``,
    });
  } catch (err) {
    console.error('send_to_brain error:', err);
    await client.chat.postEphemeral({
      channel: channelId, user: shortcut.user.id,
      text: `❌ Failed to ingest thread: ${err.message}`,
    });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

await app.start();
console.log('⚡ Brain bot running in Socket Mode — DM me or mention @brain in any channel');
