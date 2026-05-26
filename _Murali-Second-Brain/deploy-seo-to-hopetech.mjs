// deploy-seo-to-hopetech.mjs — copy generated SEO HTML pages into the
// openclaw-for-hostinger repo (hopetech.me's source), commit + push.
// Hostinger auto-deploys on git push.
//
// Usage:
//   node --env-file=.env.local _Murali-Second-Brain/deploy-seo-to-hopetech.mjs [--dry] [--no-push]
//
// Requires: local clone of github.com/chatgptnotes/openclaw-for-hostinger.
// Override path via HOPETECH_REPO env var.

import { readdir, readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const VAULT_ROOT = new URL('../', import.meta.url).pathname;
const HTML_SRC   = join(VAULT_ROOT, '_Marketing', 'seo-pages', 'html');
const HOPETECH_REPO = process.env.HOPETECH_REPO || '/Users/murali/openclaw-for-hostinger';
const PUBLIC_DIR    = join(HOPETECH_REPO, 'public');

const DRY     = process.argv.includes('--dry');
const NO_PUSH = process.argv.includes('--no-push');

async function ensureRepoClean() {
  try { await stat(join(HOPETECH_REPO, '.git')); }
  catch { throw new Error(`Repo not found at ${HOPETECH_REPO}. Clone with: gh repo clone chatgptnotes/openclaw-for-hostinger ${HOPETECH_REPO}`); }
  const status = execSync(`git -C "${HOPETECH_REPO}" status --short`, { encoding: 'utf8' });
  if (status.trim()) console.log(`⚠ Repo has local changes:\n${status}\nProceeding — new files will commit alongside.`);
}

async function copyTree() {
  const slugs = (await readdir(HTML_SRC, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name);
  console.log(`Source: ${slugs.length} SEO directories under ${HTML_SRC}`);
  let copied = 0;
  for (const slug of slugs) {
    const srcFile = join(HTML_SRC, slug, 'index.html');
    try { await stat(srcFile); }
    catch { console.log(`  ⚠ ${slug}: no index.html — skipping`); continue; }
    const destDir = join(PUBLIC_DIR, slug);
    if (DRY) { console.log(`  [DRY] ${srcFile} → ${join(destDir, 'index.html')}`); copied++; continue; }
    await mkdir(destDir, { recursive: true });
    await copyFile(srcFile, join(destDir, 'index.html'));
    copied++;
  }

  // Sitemap goes to the root of public/ — accessible at /sitemap.xml
  const sitemapSrc = join(HTML_SRC, 'sitemap.xml');
  try {
    await stat(sitemapSrc);
    if (DRY) console.log(`  [DRY] sitemap.xml → ${PUBLIC_DIR}/sitemap.xml`);
    else    await copyFile(sitemapSrc, join(PUBLIC_DIR, 'sitemap.xml'));
  } catch { /* no sitemap yet */ }

  // robots.txt — only write if it doesn't already exist (don't clobber)
  const robotsPath = join(PUBLIC_DIR, 'robots.txt');
  try { await stat(robotsPath); console.log('  ⊘ robots.txt exists — leaving alone'); }
  catch {
    if (DRY) console.log(`  [DRY] would write ${robotsPath}`);
    else {
      await writeFile(robotsPath, `User-agent: *\nAllow: /\nSitemap: https://hopetech.me/sitemap.xml\n`);
      console.log(`  ✓ Wrote ${robotsPath}`);
    }
  }

  return copied;
}

async function commitAndPush(copied) {
  if (DRY) return;
  const cmds = [
    `cd "${HOPETECH_REPO}"`,
    `git add public/`,
    `git -C "${HOPETECH_REPO}" diff --cached --quiet || git commit -m "feat(seo): deploy ${copied} programmatic landing pages

Auto-generated from Bettroi brain via _Murali-Second-Brain/programmatic-seo-generator.mjs.
Each page targets a (vertical × use-case) keyword combination.
Sitemap at /sitemap.xml.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`,
  ].join(' && ');
  console.log('Committing...');
  try { execSync(cmds, { stdio: 'inherit' }); }
  catch (e) { console.log('Nothing to commit (or commit failed).'); return; }

  if (NO_PUSH) { console.log('--no-push set — skipping push'); return; }
  console.log('Pushing to origin...');
  execSync(`git -C "${HOPETECH_REPO}" push origin main`, { stdio: 'inherit' });
  console.log('✓ Pushed. Hostinger will auto-deploy.');
}

async function run() {
  await ensureRepoClean();
  const copied = await copyTree();
  console.log(`\n✓ ${copied} page${copied===1?'':'s'} copied to ${PUBLIC_DIR}`);
  if (copied > 0) await commitAndPush(copied);
}

run().catch(e => { console.error('Deploy failed:', e.message); process.exit(1); });
