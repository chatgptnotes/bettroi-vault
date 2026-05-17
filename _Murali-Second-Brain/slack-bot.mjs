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

// Role lookup — checks brain_user_roles table; falls back to 'murali' for the owner,
// 'public' (no access) for everyone unmapped.
async function roleFor(slackUserId) {
  if (slackUserId === MURALI_ID) return 'murali';
  try {
    const { data } = await supabase
      .from('brain_user_roles')
      .select('role')
      .eq('slack_user_id', slackUserId)
      .maybeSingle();
    return data?.role ?? 'public';
  } catch {
    return 'public';
  }
}

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
  const role = await roleFor(event.user);
  if (role === 'public') { await say({ text: '_You do not have access to the brain. Ask Murali to grant you access._', thread_ts: event.ts }); return; }

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

  const role = await roleFor(event.user);
  if (role === 'public') {
    await client.chat.postMessage({ channel: event.channel, text: '_You do not have access to the brain. Ask Murali to grant you access._' });
    return;
  }
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

// ── #brain-inbox: ingest new messages (diary OCR pipeline + text capture) ───

import { writeFile, mkdir } from 'node:fs/promises';
import { join as pathJoin, dirname as pathDirname } from 'node:path';
const VAULT_PATH = '/Users/murali/BeBrain/bettroi-vault';

// Project folders the OCR auto-classifier can route to
const KNOWN_PROJECTS = [
  'Adamrit', 'Adamrit.com', 'Hope', 'NABH-quality-HR', 'BNI-Networking',
  'Doctors digital office', 'Pangong-preventive-healthcare', 'Foyertech',
  'Bettroi-HopeTech-project-status', 'hopetech.me', 'fluxio.work Standupmeeting',
  'pulseofproject.com', '2men.co', 'Linkist.ai', 'DDO.center', 'aiinmail.com',
  'pratyaya.in', 'hrpulse.site', 'modeaewintrack.com', 'drawtoboq.com',
  'decodemybrain.com', 'nexaproc.in', 'bajajenergy.nexaproc.in',
  'PIMS.nexaproc.in', 'adnoc.nexaproc.in', 'digitaltwin.nexaproc.in',
  'solaxis.com', 'amprix.in', 'app.headzhairfixing.com',
  'limitlessbrainlab.com', 'flowaccel.work',
  'Manufacturing Planning and JIT procurement agent',
];

async function classifyDiaryPage(ocrText) {
  if (!process.env.ANTHROPIC_API_KEY) return { folder: '_inbox', date: null, summary: '' };
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sys = `You classify Murali's handwritten paper diary pages.

Folders: ${KNOWN_PROJECTS.join(' | ')}

From the extracted text, determine:
- "folder": single best-match project folder, or "_inbox" if unclear
- "date": YYYY-MM-DD if a date is written on the page, else null
- "summary": one factual line (8-14 words) capturing what's on the page

Output ONLY JSON: {"folder": "<name>", "date": "YYYY-MM-DD" or null, "summary": "<line>"}`;
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: sys,
      messages: [{ role: 'user', content: ocrText.slice(0, 2000) }],
    });
    const m = res.content[0].text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { folder: '_inbox', date: null, summary: '' };
  } catch (e) {
    return { folder: '_inbox', date: null, summary: '' };
  }
}

async function ocrDiaryPage(base64, mimetype) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',  // Sonnet handles handwriting much better than Haiku
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimetype, data: base64 } },
        { type: 'text', text: `This is a photo of Murali's handwritten paper diary or notebook page. Extract ALL text faithfully — including dates, names, lists, tables, marginalia, scribbles.

Preserve structure:
- Headers and sub-headers
- Bullet lists / numbered lists
- Crossed-out items (mark as ~~text~~)
- Boxes / check marks → use [ ] and [x]
- Tables as markdown tables
- Dates exactly as written

If text is illegible, write [illegible]. Output ONLY the extracted markdown — no preamble.` }
      ]
    }]
  });
  return res.content[0].text;
}

function safeSlug(s) { return (s || 'page').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40); }

app.event('message', async ({ event, client }) => {
  if (event.channel !== BRAIN_INBOX || event.bot_id || event.subtype) return;

  const text = event.text ?? '';
  const prefixMatch = text.match(/^\[([^\]]+)\]/);
  const userTag = prefixMatch ? prefixMatch[1] : null;
  const content = prefixMatch ? text.slice(prefixMatch[0].length).trim() : text;

  // Handle image attachments (diary photos)
  if (event.files?.length) {
    for (const file of event.files) {
      if (!file.mimetype?.startsWith('image/')) continue;
      try {
        // Quick ack so user knows we're working
        const ack = await client.chat.postMessage({
          channel: event.channel, thread_ts: event.ts,
          text: `📖 Reading diary page...`,
        });

        const imgRes = await fetch(file.url_private, {
          headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` }
        });
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        const ocrText = await ocrDiaryPage(base64, file.mimetype);
        if (ocrText.length < 20) {
          await client.chat.update({ channel: ack.channel, ts: ack.ts, text: '⚠ Could not read text from this image.' });
          continue;
        }

        // Classify: user prefix wins; otherwise auto-classify
        let project_tag = userTag, dateStr = null, summary = '';
        if (!project_tag) {
          const cls = await classifyDiaryPage(ocrText);
          project_tag = KNOWN_PROJECTS.includes(cls.folder) ? cls.folder : '_inbox';
          dateStr = cls.date;
          summary = cls.summary;
        }
        if (!dateStr) dateStr = new Date().toISOString().slice(0, 10);

        // Write .md file to vault folder (visible in Obsidian immediately)
        const diaryDir = pathJoin(VAULT_PATH, project_tag, 'diary');
        await mkdir(diaryDir, { recursive: true });
        const fileName = `${dateStr} - diary-${safeSlug(summary || file.id.slice(-6))}.md`;
        const filePath = pathJoin(diaryDir, fileName);
        const slackPermalink = file.permalink ?? `slack://${event.channel}/${event.ts}`;
        const md = [
          '---',
          `date: ${dateStr}`,
          `source: diary`,
          `slack_message: ${slackPermalink}`,
          summary ? `summary: ${JSON.stringify(summary)}` : null,
          `project: ${project_tag}`,
          `captured_at: ${new Date().toISOString()}`,
          '---',
          '',
          `# Diary — ${dateStr}`,
          summary ? `\n*${summary}*\n` : '',
          ocrText,
          '',
        ].filter(Boolean).join('\n');
        await writeFile(filePath, md);

        // Ingest into brain immediately (don't wait for obsidian-sync cron)
        const relPath = filePath.replace(VAULT_PATH + '/', '');
        await ingestText({
          text: ocrText,
          project_tag: project_tag.toLowerCase().replace(/\s+/g, '-'),
          source_type: 'diary',
          source_ref: relPath,
          metadata: { date: dateStr, summary, off_limits: false },
        });

        // Acknowledge with preview
        const preview = ocrText.slice(0, 250).replace(/\n+/g, ' ');
        await client.chat.update({
          channel: ack.channel, ts: ack.ts,
          text: `✅ *Diary page filed* → \`${project_tag}/diary/${fileName}\`\n*Date:* ${dateStr}${summary ? `\n*Summary:* ${summary}` : ''}\n*Preview:* _${preview}${ocrText.length > 250 ? '...' : ''}_\n\nReply in this thread with corrections if the OCR or classification is wrong.`,
        });
      } catch (e) {
        console.error('Diary OCR failed:', e);
        await client.chat.postMessage({
          channel: event.channel, thread_ts: event.ts,
          text: `❌ Diary OCR failed: ${e.message}`,
        });
      }
    }
  }

  // Ingest text content (non-image messages)
  if (!event.files?.length && content.length > 10) {
    await ingestText({ text: content, project_tag: userTag ?? '_inbox', source_type: 'slack', source_ref: `slack://${event.channel}/${event.ts}`, metadata: { date: new Date().toISOString() } });
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
