// pulseofproject-sync.mjs — pull bug reports + projects (the "who does what"
// view) from pulseofproject.com's Supabase and ingest into brain_chunks so the
// team and agents can query status.
//
// pulseofproject.com is a Supabase-backed app (repo: chatgptnotes/pulseofproject).
// Reads its tables directly, like sync-bni-contacts.mjs. Usage: npm run brain:pulse
//
// Needs in .env.local (from the pulseofproject "bugtracking" Supabase project,
// Dashboard → Project Settings → API):
//   PULSE_SUPABASE_URL=...
//   PULSE_SUPABASE_SERVICE_KEY=...   (service_role key)

import { createClient } from '@supabase/supabase-js';
import { ingestText } from './ingest.mjs';

const SOURCE = 'pulseofproject';

function requireEnv() {
  const missing = ['PULSE_SUPABASE_URL', 'PULSE_SUPABASE_SERVICE_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env var(s): ${missing.join(', ')}`);
    console.error('Add the pulseofproject "bugtracking" Supabase URL + service_role key to .env.local');
    console.error('(Dashboard → Project Settings → API), and to GitHub repo secrets for CI.');
    process.exit(1);
  }
}

const pulse = () => createClient(process.env.PULSE_SUPABASE_URL, process.env.PULSE_SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const brain = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function getLastSync(sb) {
  const { data } = await sb.from('brain_sync_state').select('last_synced').eq('source', SOURCE).single();
  return data?.last_synced ?? '1970-01-01';
}
async function setLastSync(sb, ts) {
  await sb.from('brain_sync_state').upsert({ source: SOURCE, last_synced: ts }, { onConflict: 'source' });
}

// Paginated fetch of explicit columns since `since`. Selecting explicit columns
// (not *) avoids pulling heavy fields like image_url that cause statement timeouts.
async function fetchSince(src, table, columns, since) {
  const PAGE = 500;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await src.from(table)
      .select(columns).gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function run() {
  requireEnv();
  console.log('pulseofproject sync starting...');
  const src = pulse();
  const dst = brain();
  const since = await getLastSync(dst);
  console.log(`Last sync: ${since}`);
  const now = new Date().toISOString();
  let ingested = 0, failedChunks = 0;

  // ── Bug reports (bugs + who does what) ─────────────────────────────────────
  // Schema (chatgptnotes/pulseofproject, bug_reports table): project_name,
  // project_version, sno, date, module, screen, snag, severity (P1/P2/P3),
  // status, testing_status, assigned_to, reported_by, comments, image_url.
  const bugs = await fetchSince(src, 'bug_reports',
    'id,project_name,project_version,sno,date,module,screen,snag,severity,status,testing_status,assigned_to,reported_by,comments,type,updated_at',
    since);

  for (const b of bugs ?? []) {
    const text = [
      `${b.type ?? 'Bug'} #${b.sno ?? ''}: ${b.snag ?? ''}`,
      `Project: ${b.project_name ?? 'Unknown'}${b.project_version ? ' (' + b.project_version + ')' : ''}`,
      b.module ? `Module: ${b.module}` : null,
      b.screen ? `Screen: ${b.screen}` : null,
      b.severity ? `Severity: ${b.severity}` : null,
      b.status ? `Status: ${b.status}` : null,
      b.testing_status ? `Testing: ${b.testing_status}` : null,
      `Assigned to: ${b.assigned_to ?? 'Unassigned'}`,
      b.reported_by ? `Reported by: ${b.reported_by}` : null,
      b.comments ? `\nComments: ${b.comments}` : null,
    ].filter(v => v !== null && v !== undefined).join('\n');

    const ref = `pulseofproject://bug/${b.id}`;
    await dst.from('brain_chunks').delete().eq('source_ref', ref); // idempotent
    const r = await ingestText({
      text,
      project_tag: b.project_name ?? '_inbox',
      source_type: SOURCE,
      source_ref: ref,
      metadata: {
        kind: 'bug', sno: b.sno, severity: b.severity, status: b.status,
        testing_status: b.testing_status, assigned_to: b.assigned_to, project: b.project_name,
      },
    });
    ingested++; failedChunks += r?.failed ?? 0;
  }
  console.log(`  bugs: ${bugs?.length ?? 0} ingested`);

  // ── Projects (status + ownership) ──────────────────────────────────────────
  // admin_projects: id, name, client, description, status, priority, progress,
  // deadline, team_count, category, url.
  let projects = [];
  try {
    projects = await fetchSince(src, 'admin_projects', '*', since);
  } catch (e) {
    console.warn(`  admin_projects fetch skipped: ${e.message}`);
  }
  {
    for (const p of projects ?? []) {
      const text = [
        `Project: ${p.name}`,
        `Client: ${p.client ?? 'Unknown'}`,
        p.status ? `Status: ${p.status}` : null,
        p.priority ? `Priority: P${p.priority}` : null,
        p.progress != null ? `Progress: ${p.progress}%` : null,
        p.deadline ? `Deadline: ${p.deadline}` : null,
        p.category ? `Category: ${p.category}` : null,
        p.url ? `URL: ${p.url}` : null,
        p.description ? `\n${p.description}` : null,
      ].filter(v => v !== null && v !== undefined).join('\n');

      const ref = `pulseofproject://project/${p.id}`;
      await dst.from('brain_chunks').delete().eq('source_ref', ref); // idempotent
      const r = await ingestText({
        text,
        project_tag: p.name,
        source_type: SOURCE,
        source_ref: ref,
        metadata: { kind: 'project', client: p.client, status: p.status, priority: p.priority, progress: p.progress },
      });
      ingested++; failedChunks += r?.failed ?? 0;
    }
    console.log(`  projects: ${projects?.length ?? 0} ingested`);
  }

  // Only advance the cursor if every chunk embedded+stored. Otherwise leave it
  // so a re-run (after e.g. OpenAI quota is restored) re-ingests these records.
  if (failedChunks === 0) {
    await setLastSync(dst, now);
    console.log(`\npulseofproject sync complete. Ingested ${ingested} record(s).`);
  } else {
    console.warn(`\n⚠ ${failedChunks} chunk(s) failed to embed — cursor NOT advanced. Fix the cause (e.g. OpenAI quota) and re-run \`npm run brain:pulse\`.`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
