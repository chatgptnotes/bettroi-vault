// repo-overview.mjs — extract overview of GitHub repos and write to Obsidian
// Usage: node --env-file=.env.local _Murali-Second-Brain/repo-overview.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;

// Domain → canonical repo mapping
const SITES = [
  { domain: 'hopetech.me', repo: 'openclaw-for-hostinger', folder: 'hopetech.me', label: 'OpenClaw Dashboard' },
  { domain: 'fluxio.work', repo: 'hopehospital-dashboard',   folder: 'fluxio.work Standupmeeting', label: 'Hope+Ayushman Operations' },
  { domain: 'pulseofproject.com', repo: 'pulseofproject',    folder: 'pulseofproject.com', label: 'Software Operations Tracker' },
  { domain: 'adamrit.com', repo: 'adamrit',                  folder: 'Adamrit.com', label: 'Hospital Management System' },
  { domain: 'nabh.online', repo: 'nabh_online_saas',         folder: 'NABH-quality-HR', label: 'NABH Quality + HR Platform' },
];

function ghJSON(path) {
  try {
    return JSON.parse(execSync(`gh api ${path}`, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' }));
  } catch (e) {
    return null;
  }
}

function ghFile(repo, path) {
  const data = ghJSON(`repos/chatgptnotes/${repo}/contents/${encodeURIComponent(path)}`);
  if (!data || !data.content) return null;
  try {
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch { return null; }
}

function fmtSize(bytes) {
  if (!bytes) return '?';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

async function buildOverview(site) {
  console.log(`\n[${site.domain}] → ${site.repo}`);
  const meta = ghJSON(`repos/chatgptnotes/${site.repo}`);
  if (!meta) return `❌ Could not fetch ${site.repo}`;

  // Top-level directory listing
  const root = ghJSON(`repos/chatgptnotes/${site.repo}/contents`) || [];
  const tree = ghJSON(`repos/chatgptnotes/${site.repo}/git/trees/${meta.default_branch}?recursive=1`);

  // Key files
  const readme = ghFile(site.repo, 'README.md');
  const pkgJson = ghFile(site.repo, 'package.json');
  let pkgInfo = '';
  if (pkgJson) {
    try {
      const p = JSON.parse(pkgJson);
      const deps = Object.keys(p.dependencies ?? {}).slice(0, 30);
      const devDeps = Object.keys(p.devDependencies ?? {}).slice(0, 20);
      pkgInfo = `**Name:** ${p.name ?? '?'}  ·  **Version:** ${p.version ?? '?'}  ·  **Type:** ${p.type ?? 'commonjs'}\n\n` +
        (p.scripts ? '**Scripts:**\n' + Object.entries(p.scripts).map(([k, v]) => `- \`${k}\`: \`${v}\``).join('\n') + '\n\n' : '') +
        (deps.length ? `**Dependencies (${Object.keys(p.dependencies).length}):** ${deps.join(', ')}${deps.length === 30 ? '...' : ''}\n\n` : '') +
        (devDeps.length ? `**Dev Dependencies (${Object.keys(p.devDependencies).length}):** ${devDeps.join(', ')}${devDeps.length === 20 ? '...' : ''}` : '');
    } catch {}
  }

  // Build tree summary by top folder
  let treeSummary = '';
  if (tree?.tree) {
    const byTopFolder = {};
    for (const item of tree.tree) {
      if (item.type !== 'blob') continue;
      const top = item.path.split('/')[0];
      byTopFolder[top] = (byTopFolder[top] ?? 0) + 1;
    }
    const sorted = Object.entries(byTopFolder).sort((a, b) => b[1] - a[1]).slice(0, 15);
    treeSummary = sorted.map(([f, n]) => `- \`${f}/\` — ${n} file${n > 1 ? 's' : ''}`).join('\n');
  }

  // Top-level files (not folders)
  const rootFiles = Array.isArray(root)
    ? root.filter(r => r.type === 'file').map(r => `- \`${r.name}\` (${fmtSize(r.size)})`).slice(0, 30).join('\n')
    : '';

  // Recent commits
  const commits = ghJSON(`repos/chatgptnotes/${site.repo}/commits?per_page=10`) || [];
  const commitList = commits.slice(0, 10).map(c => {
    const sha = c.sha.slice(0, 7);
    const msg = c.commit.message.split('\n')[0].slice(0, 80);
    const date = c.commit.author.date.slice(0, 10);
    return `- \`${sha}\` _${date}_ — ${msg}`;
  }).join('\n');

  const fm = [
    '---',
    `domain: ${site.domain}`,
    `repo: chatgptnotes/${site.repo}`,
    `default_branch: ${meta.default_branch}`,
    `last_push: ${meta.pushed_at}`,
    `size_kb: ${meta.size}`,
    `language: ${meta.language ?? 'unknown'}`,
    `description: ${JSON.stringify(meta.description ?? '')}`,
    `extracted: ${new Date().toISOString()}`,
    '---',
    '',
  ].join('\n');

  const body = `# ${site.label} — \`${site.domain}\`

**Live URL:** https://${site.domain}/
**GitHub repo:** https://github.com/chatgptnotes/${site.repo}
**Default branch:** \`${meta.default_branch}\`  ·  **Last push:** ${meta.pushed_at}
**Language:** ${meta.language ?? 'unknown'}  ·  **Repo size:** ${meta.size}KB

${meta.description ? `> ${meta.description}\n` : ''}

## Tech stack

${pkgInfo || '_(no package.json found)_'}

## Top-level files

${rootFiles || '_(none)_'}

## Folder breakdown

${treeSummary || '_(no tree)_'}

## Recent commits

${commitList || '_(no commits)_'}

## README

${readme ? '```markdown\n' + readme.slice(0, 8000) + (readme.length > 8000 ? '\n\n... (truncated)' : '') + '\n```' : '_(no README.md)_'}

---

*Generated by \`brain:repo-overview\` — re-run anytime to refresh.*
`;

  return fm + body;
}

async function run() {
  for (const site of SITES) {
    const md = await buildOverview(site);
    const dir = join(VAULT_ROOT, site.folder);
    await mkdir(dir, { recursive: true });
    const path = join(dir, `repo-overview.md`);
    await writeFile(path, md);
    console.log(`  ✓ ${site.folder}/repo-overview.md`);
  }
  console.log('\nNext: npm run brain:obsidian   (ingests repo overviews into the brain)');
}

run().catch(err => { console.error(err); process.exit(1); });
