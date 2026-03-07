#!/usr/bin/env node

/**
 * draft-generator.mjs
 *
 * Takes a research dossier (JSON file) and article type as input.
 * Generates a structured draft article using OpenAI API.
 * Saves the draft to output/drafts/ and prints the path to stdout.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/draft-generator.mjs <dossier.json> <article-type>
 *
 * Article types: cavc-analysis, policy-update, claims-strategy, explainer, opinion, news
 *
 * Environment:
 *   OPENAI_API_KEY  - Required
 *   OPENAI_MODEL    - Optional (default: gpt-4o)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPostPrompt, buildNewsPrompt } from '../templates/system-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args) {
  process.stderr.write(`[draft-generator] ${args.join(' ')}\n`);
}

function fatal(msg) {
  log(`ERROR: ${msg}`);
  process.exit(1);
}

async function loadJSON(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

function calculateReadTime(body, wpm = 250) {
  const words = body.split(/\s+/).filter(Boolean).length;
  return `${Math.ceil(words / wpm)} min`;
}

function mergeProfile(baseGuide, profileConfig, profileKey) {
  if (!profileConfig?.profiles) return { ...baseGuide };
  const resolvedKey = profileConfig.profiles[profileKey] ? profileKey : profileConfig.defaultProfile;
  return {
    ...baseGuide,
    activeProfile: resolvedKey,
    profileSettings: profileConfig.profiles[resolvedKey] || null,
  };
}

function formatDate(d = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function toISOTimestamp(d = new Date()) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

// ---------------------------------------------------------------------------
// ID assignment
// ---------------------------------------------------------------------------

async function getNextPostId() {
  const postsDir = join(ROOT, '..', '..', 'posts');
  try {
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(postsDir);
    const ids = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const match = f.match(/^(\d+)-/);
        return match ? parseInt(match[1], 10) : 0;
      });
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
  } catch {
    log('Could not read posts directory, defaulting to id=1');
    return 1;
  }
}

async function getNextNewsId() {
  const newsPath = join(ROOT, '..', '..', 'public', 'news.json');
  try {
    const newsItems = await loadJSON(newsPath);
    const ids = newsItems
      .map(n => parseInt(n.id.replace('n', ''), 10))
      .filter(n => !isNaN(n));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `n${String(maxId + 1).padStart(3, '0')}`;
  } catch {
    log('Could not read news.json, defaulting to id=n001');
    return 'n001';
  }
}

// ---------------------------------------------------------------------------
// OpenAI API call
// ---------------------------------------------------------------------------

async function callOpenAI(systemPrompt, userPrompt, temperature) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) fatal('OPENAI_API_KEY environment variable is not set');

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  log(`Using model: ${model}, temperature: ${temperature}`);

  const requestBody = {
    model,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 8192,
  };

  log('Sending request to OpenAI API...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errBody = await response.text();
    fatal(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) fatal('No content in OpenAI response');

  log(`Response received. Tokens used: prompt=${data.usage?.prompt_tokens}, completion=${data.usage?.completion_tokens}`);

  // Parse JSON from the response — handle possible markdown fences
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    log('Failed to parse JSON response. Raw content:');
    log(cleaned.substring(0, 500));
    fatal(`JSON parse error: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const VALID_ARTICLE_TYPES = ['cavc-analysis', 'policy-update', 'claims-strategy', 'explainer', 'opinion', 'news'];

function parseArgs(argv) {
  const opts = { dossierPath: null, articleType: null, contentType: 'post', stdin: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--type':         opts.contentType = argv[++i]; break;
      case '--article-type': opts.articleType = argv[++i]; break;
      case '--stdin':        opts.stdin = true; break;
      default:
        // Positional args: first is dossier path, second is article type
        if (!argv[i].startsWith('--')) {
          if (!opts.dossierPath) opts.dossierPath = argv[i];
          else if (!opts.articleType) opts.articleType = argv[i];
        }
    }
  }
  return opts;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Determine article type - if contentType is 'news', use 'news' as article type
  let articleType = opts.articleType;
  if (!articleType) {
    articleType = opts.contentType === 'news' ? 'news' : 'policy-update';
  }

  if (!VALID_ARTICLE_TYPES.includes(articleType)) {
    fatal(`Invalid article type: "${articleType}". Must be one of: ${VALID_ARTICLE_TYPES.join(', ')}`);
  }

  // Load config files
  log('Loading style guide, style profiles, and content schemas...');
  const styleGuideBase = await loadJSON(join(ROOT, 'config', 'style-guide.json'));
  const styleProfiles = await loadJSON(join(ROOT, 'config', 'style-profiles.json'));
  const contentSchemas = await loadJSON(join(ROOT, 'config', 'content-schemas.json'));

  // Load research dossier from stdin or file
  let dossier;
  if (opts.stdin) {
    log('Reading research dossier from stdin...');
    dossier = await readStdin();
  } else if (opts.dossierPath) {
    log(`Loading research dossier: ${opts.dossierPath}`);
    dossier = await loadJSON(opts.dossierPath);
  } else {
    fatal('No dossier provided. Use --stdin or provide a file path.');
  }

  const styleProfile = dossier.styleProfile || articleType;
  const styleGuide = mergeProfile(styleGuideBase, styleProfiles, styleProfile);
  dossier.styleProfileResolved = styleGuide.activeProfile;

  // Determine temperature from schema
  const typeConfig = contentSchemas.contentTypes[articleType];
  const temperature = typeConfig?.temperature ?? 0.7;

  // Build prompt and call API
  let systemPrompt;
  let userPrompt = 'Generate the article from the research dossier provided in the system prompt. Return only the JSON object.';

  const isNews = articleType === 'news';

  if (isNews) {
    systemPrompt = buildNewsPrompt(styleGuide, contentSchemas, dossier);
  } else {
    systemPrompt = buildPostPrompt(styleGuide, contentSchemas, dossier, articleType);
  }

  const draft = await callOpenAI(systemPrompt, userPrompt, temperature);

  // Fill in auto-generated fields
  const now = new Date();

  if (isNews) {
    draft.id = draft.id || await getNextNewsId();
    draft.date = draft.date || formatDate(now);
    draft.timestamp = draft.timestamp || toISOTimestamp(now);
    draft.author = draft.author || 'Chris Combs';
    if (draft.body) {
      draft.readTime = draft.readTime || calculateReadTime(draft.body);
    }
  } else {
    draft.id = draft.id || await getNextPostId();
    draft.date = draft.date || formatDate(now);
    draft.author = draft.author || 'Chris Combs';
    draft.featured = draft.featured ?? false;
    if (draft.body) {
      draft.readTime = draft.readTime || calculateReadTime(draft.body);
    }
    if (draft.title && !draft.heroImage) {
      draft.heroImage = `/images/post-${slugify(draft.title)}-hero.png`;
    }
  }

  draft.styleProfile = dossier.styleProfileResolved || styleProfile;
  draft.researchPacketId = dossier.dossierId || null;

  // Save to output/drafts/
  const outputDir = join(ROOT, 'output', 'drafts');
  await mkdir(outputDir, { recursive: true });

  const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const prefix = isNews ? draft.id : String(draft.id).padStart(3, '0');
  const slug = draft.title ? slugify(draft.title) : 'untitled';
  const outputFilename = `${prefix}-${slug}-${timestamp}.json`;
  const outputPath = join(outputDir, outputFilename);

  await writeFile(outputPath, JSON.stringify(draft, null, 2), 'utf-8');

  log(`Draft saved: ${outputPath}`);
  log(`Title: ${draft.title}`);
  log(`Type: ${articleType} | Section: ${draft.section || draft.category} | ReadTime: ${draft.readTime}`);
  log(`Word count: ~${draft.body ? draft.body.split(/\s+/).length : 0}`);

  // Output the draft JSON to stdout for pipeline consumption
  process.stdout.write(JSON.stringify(draft, null, 2) + '\n');
}

main().catch(err => {
  fatal(`Unhandled error: ${err.message}`);
});
