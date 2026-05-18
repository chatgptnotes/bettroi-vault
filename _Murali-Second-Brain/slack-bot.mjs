// slack-bot.mjs — @brain Slack bot via Socket Mode (no server needed)
// Usage: node --env-file=.env.local _Murali-Second-Brain/slack-bot.mjs

import { App } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';
import { queryBrain } from './query.mjs';
import { ingestText } from './ingest.mjs';
import { callClaude } from './ai-client.mjs';

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

async function buildMeetingPrep(topic, role) {
  // 1. Vector search for the topic
  const { queryBrain } = await import('./query.mjs');
  const { answer, sources } = await queryBrain({
    question: `Give a pre-meeting briefing on "${topic}". Cover: (1) key people involved, (2) latest decisions/status, (3) open commitments, (4) anything contradictory or needing follow-up. Be concise — 8-12 bullet points max. Use real names/dates from the sources.`,
    role,
  });

  // 2. Look for related action items
  // Find related action items by keyword match
  const keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let itemsBlock = '';
  if (keywords.length) {
    const { data: items } = await supabase
      .from('brain_action_items')
      .select('item_text, assignee, due_date, project_tag, status')
      .eq('status', 'open')
      .or(keywords.map(k => `item_text.ilike.%${k}%`).join(','))
      .limit(8);
    if (items?.length) {
      const lines = items.map(i => {
        const who = i.assignee ? `*${i.assignee}*` : '_unassigned_';
        const due = i.due_date ? ` (due ${i.due_date})` : '';
        return `• ${who}: ${i.item_text}${due}`;
      });
      itemsBlock = `\n\n*🎯 Open action items mentioning "${topic}":*\n${lines.join('\n')}`;
    }
  }

  const sourceList = sources.slice(0, 4).map((s, i) => `[${i+1}] ${s}`).join('\n');
  return `*🧭 Pre-meeting briefing: ${topic}*\n\n${answer}${itemsBlock}\n\n*Sources:*\n${sourceList}`;
}

async function getOpenItemsFor(userIdent) {
  const today = new Date().toISOString().slice(0, 10);
  // Match assignee by name (case-insensitive contains)
  const { data } = await supabase
    .from('brain_action_items')
    .select('item_text, assignee, due_date, project_tag, priority, source_ref')
    .eq('status', 'open')
    .ilike('assignee', `%${userIdent}%`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(20);
  return data ?? [];
}

function formatItemsList(items) {
  if (!items.length) return '_No open action items found._';
  const today = new Date().toISOString().slice(0, 10);
  return items.map((a, i) => {
    const overdue = a.due_date && a.due_date <= today;
    const due = a.due_date ? `  (due ${a.due_date}${overdue ? ' ⚠ OVERDUE' : ''})` : '';
    const pri = a.priority === 'high' ? ' 🔥' : '';
    return `${i+1}. *${a.item_text}*${pri}${due}\n   _${a.project_tag}_`;
  }).join('\n\n');
}

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

  const lc = question.toLowerCase();

  // wa <target> <message> — send WhatsApp via Twilio Sandbox
  const waMatch = question.match(/^wa\s+(\S+)\s+(.+)/is);
  if (waMatch && role === 'murali') {
    const [, target, message] = waMatch;
    await client.chat.postMessage({ channel: event.channel, text: `📲 Sending WhatsApp via Twilio to \`${target}\`...` });
    try {
      const { sendWhatsApp } = await import('./twilio-whatsapp.mjs');
      const r = await sendWhatsApp(target, message);
      await client.chat.postMessage({
        channel: event.channel,
        text: `✅ Sent (Twilio SID \`${r.sid}\`, status: ${r.status})`,
      });
    } catch (err) {
      await client.chat.postMessage({ channel: event.channel, text: `❌ WhatsApp send failed: ${err.message}` });
    }
    return;
  }

  // prep <topic> — pre-meeting briefing
  const prepMatch = question.match(/^prep\s+(.+)/i);
  if (prepMatch) {
    const topic = prepMatch[1].trim();
    await client.chat.postMessage({ channel: event.channel, text: `🎯 Preparing briefing on *${topic}*...` });
    try {
      const brief = await buildMeetingPrep(topic, role);
      await client.chat.postMessage({ channel: event.channel, text: brief });
    } catch (err) {
      await client.chat.postMessage({ channel: event.channel, text: `Error preparing brief: ${err.message}` });
    }
    return;
  }

  // done <N> — mark item N from last DM as complete
  const doneMatch = lc.match(/^done\s+(\d+)\b/);
  if (doneMatch) {
    const n = parseInt(doneMatch[1], 10);
    const { data: state } = await supabase.from('brain_user_state').select('last_items_dm').eq('slack_user_id', event.user).maybeSingle();
    const ids = state?.last_items_dm ?? [];
    if (n < 1 || n > ids.length) {
      await client.chat.postMessage({ channel: event.channel, text: `_Item ${n} not in your last list. Send \`my items\` to refresh._` });
      return;
    }
    const id = ids[n - 1];
    const { data: item } = await supabase.from('brain_action_items').select('item_text').eq('id', id).maybeSingle();
    await supabase.from('brain_action_items').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id);
    await client.chat.postMessage({ channel: event.channel, text: `✅ Marked done: *${item?.item_text ?? '(item)'}*` });
    return;
  }

  // snooze <N> <YYYY-MM-DD> — defer item to later date
  const snoozeMatch = lc.match(/^snooze\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\b/);
  if (snoozeMatch) {
    const n = parseInt(snoozeMatch[1], 10);
    const newDate = snoozeMatch[2];
    const { data: state } = await supabase.from('brain_user_state').select('last_items_dm').eq('slack_user_id', event.user).maybeSingle();
    const ids = state?.last_items_dm ?? [];
    if (n < 1 || n > ids.length) {
      await client.chat.postMessage({ channel: event.channel, text: `_Item ${n} not in your last list. Send \`my items\` to refresh._` });
      return;
    }
    const id = ids[n - 1];
    const { data: item } = await supabase.from('brain_action_items').select('item_text').eq('id', id).maybeSingle();
    await supabase.from('brain_action_items').update({ due_date: newDate }).eq('id', id);
    await client.chat.postMessage({ channel: event.channel, text: `💤 Snoozed to ${newDate}: *${item?.item_text ?? '(item)'}*` });
    return;
  }

  // my items / open items / all items
  if (/^(my|open|all|list)?\s*(action\s+)?items?\b/.test(lc)) {
    // Resolve the user's display name from brain_user_roles
    const { data: profile } = await supabase
      .from('brain_user_roles').select('display_name').eq('slack_user_id', event.user).maybeSingle();
    const name = profile?.display_name ?? '';
    // Try first-name match — strip "(role)" suffixes etc
    const firstName = name.split(/[\s(]/)[0];

    let items = [];
    if (lc.startsWith('all') || lc.startsWith('open')) {
      const { data } = await supabase.from('brain_action_items')
        .select('id, item_text, assignee, due_date, project_tag, priority')
        .eq('status', 'open').order('due_date', { ascending: true, nullsFirst: false }).limit(20);
      items = data ?? [];
    } else if (firstName) {
      const { data } = await supabase.from('brain_action_items')
        .select('id, item_text, assignee, due_date, project_tag, priority')
        .eq('status', 'open').ilike('assignee', `%${firstName}%`)
        .order('due_date', { ascending: true, nullsFirst: false }).limit(20);
      items = data ?? [];
    }

    // Persist the order so `done N` resolves to the right item
    await supabase.from('brain_user_state').upsert({
      slack_user_id: event.user,
      last_items_dm: items.map(i => i.id),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slack_user_id' });

    await client.chat.postMessage({
      channel: event.channel,
      text: `*🎯 Open action items${firstName && !lc.startsWith('all') ? ` for ${firstName}` : ''}* (${items.length}):\n\n${formatItemsList(items)}\n\n_Reply \`done N\` to mark complete · \`snooze N YYYY-MM-DD\` to defer_`,
    });
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

// ── Smart channel watcher: auto-capture high-value messages from ALL channels ─

// Channels to skip (chatty, low-signal, social)
const SKIP_CHANNELS = new Set(['general', 'random', 'announcements', 'lounge', 'fun', 'jokes']);

// In-memory cache to avoid re-processing the same message
const seenMessages = new Set();

async function classifyImportance(text, channelName) {
  if (!text || text.length < 30) return { score: 0, type: 'too-short' };
  const cached = await import('node:crypto').then(c => c.createHash('sha1').update(text).digest('hex').slice(0, 12));
  if (seenMessages.has(cached)) return { score: 0, type: 'duplicate' };
  seenMessages.add(cached);
  if (seenMessages.size > 5000) {
    // Trim cache
    const arr = [...seenMessages].slice(-2500);
    seenMessages.clear();
    arr.forEach(x => seenMessages.add(x));
  }

  const sys = `Score the importance of this Slack message for capture into a knowledge base. Score 0-1:

1.0 = explicit DECISION ("we'll go with X", "agreed on Y at 7000")
0.9 = COMMITMENT ("I'll send the proposal Friday", "Sahil to fix bug by EOD")
0.8 = BLOCKER ("can't proceed until X", "API failing")
0.7 = KEY STATUS ("demo went well, client signed off", "moving to staging")
0.5 = GENERAL DISCUSSION or context
0.3 = QUESTION or clarification
0.1 = ACK/emoji/social ("ok", "thanks", "good morning")

Channel: ${channelName}
Output ONLY JSON: {"score": <0-1>, "type": "<decision|commitment|blocker|status|discussion|question|social>"}`;

  try {
    const res = await callClaude({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: sys,
      messages: [{ role: 'user', content: text.slice(0, 1000) }],
    });
    const m = res.content[0].text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { score: 0, type: 'parse-fail' };
  } catch (e) {
    return { score: 0, type: 'error' };
  }
}

app.event('message', async ({ event, client }) => {
  // Smart channel watcher — only for channels (not DMs / #brain-inbox / system messages)
  if (event.channel_type !== 'channel') return;
  if (event.channel === BRAIN_INBOX) return; // already handled
  if (event.bot_id || event.subtype) return;
  if (!event.text || event.text.length < 30) return;

  // Get channel name + skip noisy channels
  let channelName = event.channel;
  try {
    const info = await client.conversations.info({ channel: event.channel });
    channelName = info.channel.name ?? event.channel;
  } catch {}
  if (SKIP_CHANNELS.has(channelName)) return;

  const cls = await classifyImportance(event.text, channelName);
  if (cls.score < 0.7) return; // only capture decisions / commitments / blockers / status

  // Get user name + permalink
  let authorName = event.user;
  try {
    const u = await client.users.info({ user: event.user });
    authorName = u.user.real_name ?? u.user.name ?? event.user;
  } catch {}
  let permalink = `slack://${event.channel}/${event.ts}`;
  try {
    const p = await client.chat.getPermalink({ channel: event.channel, message_ts: event.ts });
    permalink = p.permalink ?? permalink;
  } catch {}

  const ingestPayload = {
    text: `Slack ${cls.type} in #${channelName} from ${authorName}:\n\n${event.text}\n\nLink: ${permalink}`,
    project_tag: `slack-${channelName}`,
    source_type: 'slack-auto',
    source_ref: permalink,
    metadata: { date: new Date().toISOString(), score: cls.score, type: cls.type, channel: channelName, author: authorName },
  };

  try {
    await ingestText(ingestPayload);
    // React with brain emoji to signal capture
    await client.reactions.add({ channel: event.channel, name: 'brain', timestamp: event.ts }).catch(() => {});
    console.log(`[watcher] captured ${cls.type} (${cls.score}) from #${channelName}/${authorName}`);
  } catch (e) {
    console.warn(`[watcher] ingest failed: ${e.message}`);
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
  const sys = `You classify Murali's handwritten paper diary pages.

Folders: ${KNOWN_PROJECTS.join(' | ')}

From the extracted text, determine:
- "folder": single best-match project folder, or "_inbox" if unclear
- "date": YYYY-MM-DD if a date is written on the page, else null
- "summary": one factual line (8-14 words) capturing what's on the page

Output ONLY JSON: {"folder": "<name>", "date": "YYYY-MM-DD" or null, "summary": "<line>"}`;
  try {
    const res = await callClaude({
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
  const res = await callClaude({
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
