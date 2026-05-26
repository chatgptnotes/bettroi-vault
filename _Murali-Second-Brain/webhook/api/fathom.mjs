// Vercel serverless function: Fathom webhook handler
// URL: https://<your-app>.vercel.app/api/fathom
//
// On every meeting completion, Fathom POSTs the summary here. We:
//   1. Verify signature
//   2. Classify into a project folder (Haiku)
//   3. Commit the .md note to the GitHub repo (triggers obsidian-sync workflow)
//   4. Post a Slack notification

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { callClaude } from '../../ai-client.mjs';
import { WebClient } from '@slack/web-api';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const GH_REPO  = 'chatgptnotes/bettroi-vault';
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_BRANCH = 'main';

// Existing project folders — keep in sync with vault
const PROJECT_FOLDERS = [
  'Adamrit.com', 'PIMS.nexaproc.in', 'bajajenergy.nexaproc.in', 'adnoc.nexaproc.in',
  'solaxis.com', 'digitaltwin.nexaproc.in', 'nexaproc.in', 'amprix.in',
  'Doctors digital office', 'Bettroi-HopeTech-project-status', 'flowaccel.work',
  'limitlessbrainlab.com', '2men.co', 'Linkist.ai', 'DDO.center', 'aiinmail.com',
  'fluxio.work Standupmeeting', 'pratyaya.in', 'hrpulse.site', 'app.headzhairfixing.com',
  'modeaewintrack.com', 'hopetech.me', 'drawtoboq.com', 'decodemybrain.com',
  'Adamrit', 'Manufacturing Planning and JIT procurement agent'
];

function verifySignature(rawBody, signature) {
  if (!process.env.FATHOM_WEBHOOK_SECRET || !signature) return false;
  const hmac = crypto.createHmac('sha256', process.env.FATHOM_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature.replace(/^sha256=/, '')));
}

async function classify({ title, attendees, summary }) {
  const sys = `Classify a business meeting AND write a short factual description.

Available project folders: ${PROJECT_FOLDERS.join(' | ')}

Rules:
- Pick the SINGLE most relevant folder name (exact match from the list above).
- If none fit clearly, output "_Fathom-Inbox" with confidence below 0.6.
- "description" = 8 to 14 words capturing what was decided/discussed. Be specific.

Output ONLY JSON: {"folder": "<name>", "confidence": 0..1, "description": "<8-14 words>"}`;

  const res = await callClaude({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: sys,
    messages: [{
      role: 'user',
      content: `Title: ${title}\nAttendees: ${attendees?.join(', ') || 'unknown'}\nSummary:\n${(summary || '').slice(0, 800)}`,
    }],
  });
  const text = res.content[0].text.trim();
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : { folder: '_Fathom-Inbox', confidence: 0, description: '' };
}

function safeSlug(s) {
  return s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
}

async function commitToGitHub(path, content, message) {
  // GET current file (if any) to get SHA
  let sha = null;
  try {
    const cur = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${encodeURIComponent(path)}?ref=${GH_BRANCH}`, {
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' },
    });
    if (cur.ok) sha = (await cur.json()).sha;
  } catch {}

  const res = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      branch: GH_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`GitHub commit failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-fathom-signature'] || req.headers['x-signature'];

  if (!verifySignature(rawBody, signature)) {
    return res.status(401).json({ error: 'invalid signature' });
  }

  try {
    const meeting = req.body.meeting ?? req.body;
    const title = meeting.title ?? meeting.name ?? 'Untitled Meeting';
    const url = meeting.url ?? meeting.share_url ?? '';
    const date = (meeting.created_at ?? meeting.started_at ?? new Date().toISOString()).slice(0, 10);
    const recordingId = meeting.recording_id ?? meeting.id;
    const summary = meeting.summary ?? meeting.transcript_summary ?? '';
    const attendees = meeting.attendees ?? meeting.calendar_invitees ?? [];

    const cls = await classify({ title, attendees, summary });
    const folder = (cls.confidence >= 0.6 && PROJECT_FOLDERS.includes(cls.folder)) ? cls.folder : '_Fathom-Inbox';

    const callIdMatch = url.match(/\/calls\/(\d+)/);
    const callId = callIdMatch ? callIdMatch[1] : null;

    const fm = [
      '---',
      `date: ${date}`,
      `source: fathom`,
      `url: ${url}`,
      callId ? `call_id: ${callId}` : null,
      recordingId ? `recording_id: ${recordingId}` : null,
      attendees.length ? `attendees: [${attendees.map(a => `"${typeof a === 'string' ? a : a.email || a.name}"`).join(', ')}]` : null,
      `project: ${folder}`,
      `description: ${JSON.stringify(cls.description || '')}`,
      `auto_ingested: true`,
      '---',
      '',
    ].filter(Boolean).join('\n');

    const body = `# ${title}\n\n*${date} — [Open in Fathom](${url})*\n\n${cls.description ? `> ${cls.description}\n\n` : ''}${summary}\n`;

    const path = `${folder}/meetings/${date} - ${safeSlug(title)}.md`;
    await commitToGitHub(path, fm + body, `feat(brain): auto-ingest Fathom meeting "${title}"`);

    // Notify Slack
    try {
      await slack.chat.postMessage({
        channel: process.env.SLACK_MURALI_USER_ID,
        text: `🧠 New Fathom meeting filed`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*🧠 New Fathom meeting auto-filed*\n*${title}*\n${cls.description || ''}` } },
          { type: 'context', elements: [
            { type: 'mrkdwn', text: `📂 \`${folder}\`  ·  confidence ${(cls.confidence * 100).toFixed(0)}%  ·  <${url}|Open in Fathom>` }
          ]},
        ],
      });
    } catch (e) { console.error('Slack notify failed:', e.message); }

    return res.status(200).json({ ok: true, folder, confidence: cls.confidence, path });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
