#!/usr/bin/env node
/**
 * V2V Content Publisher
 *
 * Takes approved drafts from the pipeline and integrates them into the site.
 * This is a MANUAL step - drafts are never auto-published.
 *
 * Usage:
 *   node scripts/content-pipeline/publish.mjs --draft output/drafts/draft-012.json --to post
 *   node scripts/content-pipeline/publish.mjs --draft output/drafts/draft-012.json --to news
 *   node scripts/content-pipeline/publish.mjs --list    # list pending drafts with QA scores
 */

import { readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { draft: null, to: 'post', list: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--draft': opts.draft = args[++i]; break;
      case '--to':    opts.to = args[++i]; break;
      case '--list':  opts.list = true; break;
    }
  }
  return opts;
}

const log = (msg) => console.log(msg);

async function listDrafts() {
  const draftsDir = join(__dirname, 'output/drafts');
  const qaDir = join(__dirname, 'output/qa-reports');

  let draftFiles;
  try {
    draftFiles = (await readdir(draftsDir)).filter(f => f.endsWith('.json'));
  } catch {
    log('No drafts found.');
    return;
  }

  log('\nPending Drafts:');
  log('─'.repeat(80));

  for (const file of draftFiles) {
    const draft = JSON.parse(await readFile(join(draftsDir, file), 'utf-8'));
    let qaScore = '??';
    let qaStatus = 'NOT_CHECKED';

    // Try to find matching QA report by zero-padded ID
    try {
      const idMatch = file.match(/^draft-(\d+)/);
      const qaFile = idMatch ? `qa-${idMatch[1]}.json` : file.replace('draft-', 'qa-');
      const qa = JSON.parse(await readFile(join(qaDir, qaFile), 'utf-8'));
      qaScore = qa.scorecard?.overallScore || '??';
      qaStatus = qa.scorecard?.publishReadiness || 'UNKNOWN';
    } catch { /* no QA report */ }

    const statusIcon = qaStatus === 'READY' ? '[OK]' : qaStatus === 'NEEDS_REVISION' ? '[!!]' : '[XX]';
    log(`${statusIcon} ${String(qaScore).padStart(3)}/100  ${file}`);
    log(`     "${draft.title}"`);
    log(`     Type: ${draft.section || draft.category || 'unknown'} | Tags: ${(draft.tags || []).join(', ')}`);
    log('');
  }
}

async function publishDraft(opts) {
  if (!opts.draft) {
    log('ERROR: --draft path required');
    process.exit(1);
  }

  const { isAbsolute } = await import('node:path');
  const draftPath = isAbsolute(opts.draft)
    ? opts.draft
    : join(__dirname, opts.draft);

  const draft = JSON.parse(await readFile(draftPath, 'utf-8'));

  // Remove internal pipeline metadata
  const clean = { ...draft };
  delete clean._titleAlternatives;
  delete clean._sectionSummaries;
  delete clean._researchDossier;
  delete clean._qaReport;

  if (opts.to === 'post') {
    // Determine next ID
    const postsDir = join(ROOT, 'posts');
    const existing = (await readdir(postsDir)).filter(f => f.endsWith('.json'));
    const maxId = existing.reduce((max, f) => {
      const num = parseInt(f.split('-')[0], 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);

    const newId = maxId + 1;
    clean.id = newId;

    // Generate filename
    const slug = clean.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const filename = `${String(newId).padStart(3, '0')}-${slug}.json`;
    const outPath = join(postsDir, filename);

    await writeFile(outPath, JSON.stringify(clean, null, 2) + '\n');
    log(`Published post: ${outPath}`);
    log(`Run 'node scripts/build-posts.cjs' to rebuild public/posts.json`);

  } else if (opts.to === 'news') {
    // Append to news.json
    const newsPath = join(ROOT, 'public/news.json');
    let news = [];
    try {
      news = JSON.parse(await readFile(newsPath, 'utf-8'));
    } catch { /* start fresh */ }

    // Generate next news ID
    const maxNewsNum = news.reduce((max, n) => {
      const num = parseInt(String(n.id).replace('n', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);

    clean.id = `n${String(maxNewsNum + 1).padStart(3, '0')}`;
    if (!clean.timestamp) {
      clean.timestamp = new Date().toISOString();
    }

    news.unshift(clean); // newest first
    await writeFile(newsPath, JSON.stringify(news, null, 2) + '\n');
    log(`Published news item ${clean.id}: ${newsPath}`);
  }
}

async function main() {
  const opts = parseArgs();
  if (opts.list) {
    await listDrafts();
  } else {
    await publishDraft(opts);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
