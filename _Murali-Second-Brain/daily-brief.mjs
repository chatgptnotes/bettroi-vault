// daily-brief.mjs — writes _Daily-Briefs/YYYY-MM-DD.md with today's full picture
// Usage: node --env-file=.env.local _Murali-Second-Brain/daily-brief.mjs

import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const brain = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const bni   = process.env.BNI_SUPABASE_URL
  ? createClient(process.env.BNI_SUPABASE_URL, process.env.BNI_SUPABASE_ANON_KEY)
  : null;

const VAULT_ROOT = new URL('../', import.meta.url).pathname;

function fmtDateIST(d = new Date()) {
  return d.toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}
function todayIST() {
  // 'en-CA' returns YYYY-MM-DD format
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

async function actionItemsSection() {
  const today = todayIST();
  const { data: overdue } = await brain.from('brain_action_items')
    .select('item_text, assignee, due_date, project_tag, priority')
    .eq('status', 'open').not('due_date', 'is', null).lte('due_date', today)
    .order('due_date', { ascending: true });
  const { data: dueToday } = await brain.from('brain_action_items')
    .select('item_text, assignee, due_date, project_tag, priority')
    .eq('status', 'open').eq('due_date', today);
  const { data: highOpen } = await brain.from('brain_action_items')
    .select('item_text, assignee, due_date, project_tag, priority')
    .eq('status', 'open').eq('priority', 'high').is('due_date', null).limit(20);
  const { count: totalOpen } = await brain.from('brain_action_items')
    .select('id', { count: 'exact', head: true }).eq('status', 'open');

  const fmt = (a) => `- *${a.assignee ?? 'unassigned'}*: ${a.item_text} _(${a.project_tag})_${a.due_date ? ' — due ' + a.due_date : ''}`;

  let section = `## 🎯 Action items (${totalOpen} open)\n\n`;
  section += `### Overdue (${(overdue ?? []).length})\n`;
  section += (overdue?.length ? overdue.slice(0, 15).map(fmt).join('\n') : '_None — clean slate_') + '\n\n';
  section += `### Due today (${(dueToday ?? []).length})\n`;
  section += (dueToday?.length ? dueToday.map(fmt).join('\n') : '_None_') + '\n\n';
  section += `### High priority, no deadline (${(highOpen ?? []).length})\n`;
  section += (highOpen?.length ? highOpen.slice(0, 10).map(fmt).join('\n') : '_None_') + '\n';
  return section;
}

async function bniFollowupsSection() {
  if (!bni) return '## 👥 BNI follow-ups\n\n_BNI sync not configured._\n';
  const today = todayIST();
  const { data } = await bni.from('bni_contacts')
    .select('first, last, company, city, chapter, status, segment')
    .eq('status', 'Met').eq('hidden', false);
  if (!data?.length) return '## 👥 BNI follow-ups\n\n_No contacts._\n';

  const byCat = {};
  data.forEach(c => { (byCat[c.segment ?? 'Other'] ??= []).push(c); });

  let section = `## 👥 BNI contacts — ${data.length} met (${today})\n\n`;
  Object.entries(byCat).sort((a,b)=>b[1].length-a[1].length).forEach(([cat, list]) => {
    section += `### ${cat} (${list.length})\n`;
    section += list.slice(0, 8).map(c =>
      `- **${c.first} ${c.last || ''}** — ${c.company || '_no company_'}${c.city ? ' · ' + c.city : ''}${c.chapter ? ' · ' + c.chapter : ''}`
    ).join('\n');
    if (list.length > 8) section += `\n- _... and ${list.length - 8} more_`;
    section += '\n\n';
  });
  return section;
}

async function recentActivitySection() {
  // What was ingested in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await brain.from('brain_chunks')
    .select('source_ref, project_tag, source_type, created_at')
    .gte('created_at', since);
  if (!data?.length) return '## 📥 Brain activity (last 24h)\n\n_Nothing new._\n';

  const byProject = {};
  const sources = new Set();
  for (const c of data) {
    sources.add(c.source_ref);
    (byProject[c.project_tag] ??= 0);
    byProject[c.project_tag]++;
  }
  let section = `## 📥 Brain activity (last 24h)\n\n*${sources.size} new sources ingested, ${data.length} chunks across ${Object.keys(byProject).length} projects*\n\n`;
  section += Object.entries(byProject).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([p, n]) => `- \`${p}\` — ${n} chunks`).join('\n');
  return section + '\n';
}

async function insightsSection() {
  const { data } = await brain.from('brain_insights')
    .select('insight_type, title, description, severity, projects, recommended_action')
    .eq('status', 'new').order('severity').order('detected_at', { ascending: false }).limit(5);
  if (!data?.length) return '## 🧭 Open insights\n\n_None._\n';
  const SEV = { high: '🔴', medium: '🟠', low: '🟡', info: '🔵' };
  let section = `## 🧭 Cross-project insights (${data.length})\n\n`;
  section += data.map(i => {
    const sev = SEV[i.severity] ?? '⚪';
    const proj = (i.projects ?? []).join(', ');
    return `### ${sev} ${i.title}\n*${i.insight_type}* · _${proj}_\n${i.description}\n${i.recommended_action ? '→ **Action:** ' + i.recommended_action : ''}`;
  }).join('\n\n');
  return section + '\n';
}

async function projectActivitySection() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await brain.from('brain_chunks')
    .select('project_tag')
    .gte('created_at', since).eq('off_limits', false);
  const counts = {};
  data?.forEach(c => counts[c.project_tag] = (counts[c.project_tag] || 0) + 1);
  const skip = new Set(['_inbox','vault-root','clippings','agents','corpus','glossary','decisions']);
  const top = Object.entries(counts).filter(([k]) => !skip.has(k))
    .sort((a,b)=>b[1]-a[1]).slice(0,5);
  if (!top.length) return '## 📊 Top active projects (last 7 days)\n\n_No recent activity._\n';
  return `## 📊 Top active projects (last 7 days)\n\n${top.map(([p,n]) => `- **${p}** — ${n} chunks`).join('\n')}\n`;
}

async function run() {
  const today = todayIST();
  console.log(`Generating daily brief for ${today}...`);

  const fm = [
    '---',
    `date: ${today}`,
    `type: daily-brief`,
    `generated_at: ${new Date().toISOString()}`,
    '---',
    '',
  ].join('\n');

  const body = [
    `# 🧠 Daily Brief — ${fmtDateIST()}`,
    '',
    `_Auto-generated by the second brain at 06:00 IST. Single source of truth for "what needs attention today"._`,
    '',
    '---',
    '',
    await actionItemsSection(),
    await insightsSection(),
    await bniFollowupsSection(),
    await projectActivitySection(),
    await recentActivitySection(),
    '',
    '---',
    '',
    '*Generated by `brain:daily-brief`. Open the [Engineering Board](https://hopetech.me/bni/dev-boards.html), [Team Roster](https://fluxio.work/brain-access.html), or [BNI CRM](https://hopetech.me/bni/contacts.html).*',
  ].join('\n');

  const dir = join(VAULT_ROOT, '_Daily-Briefs');
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${today}.md`);
  await writeFile(path, fm + body);
  console.log(`✓ Wrote ${path} (${body.length.toLocaleString()} chars)`);
}

run().catch(e => { console.error(e); process.exit(1); });
