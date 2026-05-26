// import-nabh-saas.mjs — copy NABH SaaS source content (nabh.online-4th-feb repo)
// into the vault under NABH-SaaS/ as markdown so obsidian-sync can ingest it.
// The live Supabase project (aynoltymgusyasgxshng) is dead — pulling from local source instead.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

const SRC = '/Users/murali/nabh.online-4th-feb';
const DST = '/Users/murali/BeBrain/bettroi-vault/NABH-SaaS';

const FILES = [
  // NABH standards + framework data
  { src: 'src/data/nabhShcoStandards.ts',    title: 'NABH SHCO Standards (3rd Ed, 2022)',   tag: 'standards' },
  { src: 'src/data/nabhData.ts',             title: 'NABH Master Data',                     tag: 'standards' },
  { src: 'src/data/nabhLearningResources.ts', title: 'NABH Learning Resources',             tag: 'learning' },
  { src: 'src/data/nabhEvidencePrompt.ts',   title: 'NABH Evidence Prompt (AI gen template)', tag: 'evidence' },
  // Hospital org masters
  { src: 'src/data/departmentsMaster.ts',    title: 'Hospital Departments Master',          tag: 'org' },
  { src: 'src/data/doctorsMaster.ts',        title: 'Consultant Doctors Master',            tag: 'org' },
  { src: 'src/data/rmoDoctorsMaster.ts',     title: 'RMO Doctors Master',                   tag: 'org' },
  { src: 'src/data/visitingConsultantsMaster.ts', title: 'Visiting Consultants Master',     tag: 'org' },
  { src: 'src/data/staffMaster.ts',          title: 'Hospital Staff Master',                tag: 'org' },
  { src: 'src/data/equipmentMaster.ts',      title: 'Hospital Equipment Master',            tag: 'org' },
  { src: 'src/data/emergencyCodesMaster.ts', title: 'Hospital Emergency Codes',             tag: 'operations' },
  { src: 'src/data/kpiData.ts',              title: 'Hospital KPI Data',                    tag: 'kpi' },
  { src: 'sql/seed_job_descriptions.sql',    title: 'Job Descriptions (SQL seed)',          tag: 'jd' },
];

async function run() {
  await mkdir(DST, { recursive: true });

  for (const f of FILES) {
    const srcPath = join(SRC, f.src);
    let raw;
    try { raw = await readFile(srcPath, 'utf-8'); }
    catch (e) { console.warn(`skip ${f.src}: ${e.message}`); continue; }

    const lang = f.src.endsWith('.sql') ? 'sql' : 'typescript';
    const slug = basename(f.src).replace(/\.(ts|sql)$/, '');

    const md = [
      '---',
      `title: ${f.title}`,
      `source: nabh_online_saas repo (${f.src})`,
      `imported: ${new Date().toISOString().slice(0, 10)}`,
      `type: nabh-saas-source`,
      `project: NABH-SaaS`,
      `tag: ${f.tag}`,
      `off_limits: false`,
      '---',
      '',
      `# ${f.title}`,
      '',
      `> Source: \`${f.src}\` from \`nabh.online-4th-feb\` (NABH SaaS app — Supabase \`aynoltymgusyasgxshng\` is dead, pulling from local source). Live SaaS app: nabh.online`,
      '',
      '```' + lang,
      raw,
      '```',
      '',
    ].join('\n');

    await writeFile(join(DST, `${slug}.md`), md);
    console.log(`✓ ${slug}.md (${(raw.length / 1024).toFixed(1)}KB)`);
  }

  // README
  const readme = `---
title: NABH-SaaS — Knowledge Source
project: NABH-SaaS
type: index
imported: ${new Date().toISOString().slice(0, 10)}
off_limits: false
---

# NABH-SaaS Knowledge Base

Content pulled from \`~/nabh.online-4th-feb\` (the \`nabh_online_saas\` repo) on ${new Date().toISOString().slice(0, 10)}.

The live SaaS app at **nabh.online** uses Supabase project \`aynoltymgusyasgxshng\` — **that project is dead** (NXDOMAIN). So instead of pulling from the live DB, this folder holds a snapshot of the application's local source data:

## What's here

| Topic | File | Use it when... |
|-------|------|---|
| NABH SHCO 3rd Ed Standards (10 chapters, 71 standards, 408 elements) | [[nabhShcoStandards]] | Asking about specific NABH standards (AAC, COP, MOM, etc.) |
| NABH Master Data | [[nabhData]] | Asking about NABH framework, edition info, taxonomy |
| NABH Learning Resources | [[nabhLearningResources]] | Asking what training content the SaaS provides |
| NABH Evidence Prompt | [[nabhEvidencePrompt]] | Understanding how AI evidence is generated |
| Hospital Departments | [[departmentsMaster]] | Asking about hospital department structure |
| Consultant Doctors | [[doctorsMaster]] | Doctor roster |
| RMO Doctors | [[rmoDoctorsMaster]] | Resident medical officer roster |
| Visiting Consultants | [[visitingConsultantsMaster]] | Visiting consultant roster |
| Hospital Staff | [[staffMaster]] | Staff master |
| Hospital Equipment | [[equipmentMaster]] | Equipment / asset master |
| Emergency Codes | [[emergencyCodesMaster]] | Code blue / red / etc. |
| KPI Data | [[kpiData]] | Hospital KPIs |
| Job Descriptions | [[seed_job_descriptions]] | Role JDs |

## Cross-refs

- [[hospital-info]] — Hope Hospital group overview (the hospital that uses NABH-quality-HR + this SaaS)
- [[sops-operations-job-responsibilities]] — also has NABH SOPs (from the consolidated Google Doc)
- \`~/.openclaw/workspace/skills/nabh-sop-templates\` — NABH SOP templates
- \`~/.openclaw/workspace/skills/nabh-evidence-templates\` — NABH evidence templates
`;

  await writeFile(join(DST, 'README.md'), readme);
  console.log(`✓ README.md`);
}

run().catch(e => { console.error(e); process.exit(1); });
