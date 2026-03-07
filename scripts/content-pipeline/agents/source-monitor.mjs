#!/usr/bin/env node

/**
 * source-monitor.mjs - Source monitoring agent for the VA content pipeline.
 *
 * Reads sources.json, fetches each source, extracts article items, scores relevance,
 * and outputs a structured JSON array to stdout.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/source-monitor.mjs                  # Check all sources
 *   node scripts/content-pipeline/agents/source-monitor.mjs --source va-news # Check single source
 *   node scripts/content-pipeline/agents/source-monitor.mjs --help
 *
 * Output: JSON array of discovered items to stdout.
 * Status/errors go to stderr.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreRelevance, classifyTopic } from '../lib/keywords.mjs';
import { searchDecisions, batchSearch } from '../lib/bva-api-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCES_PATH = join(__dirname, '..', 'config', 'sources.json');
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  process.stderr.write(`[source-monitor] ${msg}\n`);
}

function parseArgs(argv) {
  const args = { source: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true;
    } else if (argv[i] === '--source' && argv[i + 1]) {
      args.source = argv[++i];
    }
  }
  return args;
}

function printHelp() {
  process.stderr.write(`
source-monitor.mjs - Monitor VA-related sources for new content.

Usage:
  node source-monitor.mjs [options]

Options:
  --source <id>   Check a single source by its id
  --help, -h      Show this help message

Output:
  JSON array of discovered items to stdout.
`);
}

/**
 * Fetch a URL with a timeout and return the response text.
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'V2V-ContentPipeline/1.0 (veteran2veteran research bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
        ...options.headers,
      },
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Parsers — one per source type
// ---------------------------------------------------------------------------

/**
 * Parse an RSS/Atom feed XML string into an array of raw items.
 * Uses regex-based parsing to avoid external dependencies.
 */
function parseRSSItems(xml) {
  const items = [];

  // Try RSS <item> elements first
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: extractTag(block, 'title'),
      url: extractTag(block, 'link'),
      date: extractTag(block, 'pubDate') || extractTag(block, 'dc:date'),
      snippet: stripHTML(extractTag(block, 'description') || '').slice(0, 500),
    });
  }

  // If no RSS items found, try Atom <entry> elements
  if (items.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      items.push({
        title: extractTag(block, 'title'),
        url: linkMatch ? linkMatch[1] : '',
        date: extractTag(block, 'published') || extractTag(block, 'updated'),
        snippet: stripHTML(extractTag(block, 'summary') || extractTag(block, 'content') || '').slice(0, 500),
      });
    }
  }

  return items;
}

function extractTag(xml, tag) {
  // Handle CDATA wrapped content
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(regex);
  return m ? m[1].trim() : '';
}

function stripHTML(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function shouldKeepSourceItem(source, item) {
  const title = String(item.title || '').toLowerCase();
  const snippet = String(item.snippet || '').toLowerCase();
  const combined = `${title} ${snippet}`;

  if (source.id === 'va-news') {
    const blockedPatterns = [
      /\bwomen'?s history month\b/,
      /\bmillion veteran program\b/,
      /\bcareer\b/,
      /\bnursing career\b/,
      /\btravel corps\b/,
      /\bsmall business\b/,
      /\bvetbiz\b/,
      /\brural community profile\b/,
      /\bcommunity profile\b/,
      /\bthree generations of service\b/,
    ];

    if (blockedPatterns.some(pattern => pattern.test(combined))) {
      return false;
    }
  }

  if (source.id === 'federal-register-va') {
    const isRoutineNotice =
      /^agency information collection activity/i.test(item.title || '') ||
      /\bpaperwork reduction act\b/i.test(combined) ||
      /\bomb review\b/i.test(combined);

    const keepSignals = [
      /\bfinal rule\b/i,
      /\bproposed rule\b/i,
      /\binterim final rule\b/i,
      /\brescission\b/i,
      /\bnotice of disagreement\b/i,
      /\bboard of veterans'? appeals\b/i,
      /\bintent to file\b/i,
      /\brating\b/i,
      /\bpresumptive\b/i,
      /\bpact act\b/i,
      /\bservice connection\b/i,
      /\btdiu\b/i,
    ];

    if (isRoutineNotice && !keepSignals.some(pattern => pattern.test(combined))) {
      return false;
    }
  }

  return true;
}

/**
 * Parse a web page HTML string and extract likely article links.
 */
function parseWebPage(html, baseUrl) {
  const items = [];
  // Extract links with surrounding text
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  const seenUrls = new Set();

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    const anchorText = stripHTML(match[2]).trim();

    // Skip nav, footer, and non-article links
    if (!anchorText || anchorText.length < 15 || anchorText.length > 300) continue;
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;

    // Resolve relative URLs
    if (href.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        href = `${base.protocol}//${base.host}${href}`;
      } catch { continue; }
    } else if (!href.startsWith('http')) {
      continue;
    }

    if (seenUrls.has(href)) continue;
    seenUrls.add(href);

    items.push({
      title: anchorText,
      url: href,
      date: null,
      snippet: '',
    });
  }

  return items;
}

/**
 * Parse JSON API responses.
 */
function parseAPIResponse(json, sourceId) {
  const items = [];

  try {
    const data = JSON.parse(json);

    if (sourceId === 'federal-register-va') {
      const results = data.results || [];
      for (const doc of results) {
        items.push({
          title: doc.title || '',
          url: doc.html_url || doc.url || '',
          date: doc.publication_date || null,
          snippet: (doc.abstract || doc.excerpts || '').slice(0, 500),
        });
      }
    } else if (sourceId === 'reddit-veterans-benefits') {
      const children = data?.data?.children || [];
      for (const child of children) {
        const post = child.data;
        if (!post) continue;
        items.push({
          title: post.title || '',
          url: `https://www.reddit.com${post.permalink || ''}`,
          date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
          snippet: (post.selftext || '').slice(0, 500),
        });
      }
    } else {
      // Generic JSON: try to find array of items
      const arr = Array.isArray(data) ? data : (data.results || data.items || data.data || []);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          items.push({
            title: item.title || item.name || '',
            url: item.url || item.link || item.href || '',
            date: item.date || item.published || item.created || null,
            snippet: (item.description || item.summary || item.excerpt || '').slice(0, 500),
          });
        }
      }
    }
  } catch (err) {
    log(`  JSON parse error: ${err.message}`);
  }

  return items;
}

// ---------------------------------------------------------------------------
// Main processing
// ---------------------------------------------------------------------------

/**
 * Fetch and parse a single source, returning scored items.
 */
async function processSource(source) {
  log(`Checking source: ${source.name} (${source.id})`);

  let rawText;
  try {
    rawText = await fetchWithTimeout(source.url);
  } catch (err) {
    log(`  FETCH ERROR for ${source.id}: ${err.message}`);
    return [];
  }

  log(`  Fetched ${rawText.length} bytes`);

  // Parse based on source type
  let rawItems;
  switch (source.type) {
    case 'rss':
      rawItems = parseRSSItems(rawText);
      break;
    case 'api':
      rawItems = parseAPIResponse(rawText, source.id);
      break;
    case 'web':
      rawItems = parseWebPage(rawText, source.url);
      break;
    case 'bva-api':
      rawItems = []; // handled by processBVAAPISource
      break;
    default:
      log(`  Unknown source type: ${source.type}`);
      return [];
  }

  log(`  Extracted ${rawItems.length} raw items`);

  // Score and enrich each item
  const scoredItems = [];
  for (const item of rawItems) {
    if (!item.title) continue;
    if (!shouldKeepSourceItem(source, item)) continue;

    const textForScoring = `${item.title} ${item.snippet}`;
    const relevance = scoreRelevance(textForScoring, { sourceReliability: source.reliability });
    const classification = classifyTopic(textForScoring);

    // Only include items with some VA relevance
    if (relevance.score < 5 && relevance.matchedKeywords.length === 0) continue;

    scoredItems.push({
      id: `${source.id}--${Buffer.from(item.title.slice(0, 80)).toString('base64url').slice(0, 24)}`,
      sourceId: source.id,
      sourceName: source.name,
      sourceReliability: source.reliability,
      sourceCategory: source.category,
      title: item.title,
      url: item.url,
      date: item.date || null,
      snippet: item.snippet,
      relevanceScore: relevance.score,
      matchedKeywords: relevance.matchedKeywords,
      topicCategories: relevance.categories,
      primaryTopic: classification.primary,
      cfrCitations: relevance.cfrCitations,
      caseNames: relevance.caseNames,
      discoveredAt: new Date().toISOString(),
    });
  }

  // Sort by relevance score descending
  scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

  log(`  ${scoredItems.length} relevant items after scoring`);
  return scoredItems;
}

/**
 * Process the BVA API source using the live API client.
 * Runs batch search on default queries and returns scored items.
 */
async function processBVAAPISource(source) {
  log(`Checking source: ${source.name} (${source.id}) via BVA API client`);

  const queries = source.defaultQueries || [
    'TDIU unemployability',
    'PTSD combat',
    'sleep apnea nexus',
    'secondary service connection',
  ];

  const year = new Date().getFullYear();
  const scoredItems = [];

  try {
    const batchResults = await batchSearch(queries, { year, maxPages: 1 });

    if (!Array.isArray(batchResults)) {
      log(`  BVA API returned unexpected format`);
      return [];
    }

    for (const result of batchResults) {
      if (!result.urls?.length) continue;

      // Each batch result represents a query with its top URLs
      const textForScoring = `BVA Decision: ${result.query} - ${result.count} results found in ${year}`;
      const relevance = scoreRelevance(textForScoring, { sourceReliability: source.reliability });
      const classification = classifyTopic(textForScoring);

      // Create an item for the batch result summary
      scoredItems.push({
        id: `${source.id}--${Buffer.from(result.query.slice(0, 40)).toString('base64url').slice(0, 24)}`,
        sourceId: source.id,
        sourceName: source.name,
        sourceReliability: source.reliability,
        sourceCategory: source.category,
        title: `BVA Decisions: "${result.query}" - ${result.count} cases in ${year}`,
        url: result.urls[0] || source.url,
        date: new Date().toISOString(),
        snippet: `Found ${result.count} BVA decisions for "${result.query}" in ${year}. Top case numbers: ${(result.case_numbers || []).slice(0, 5).join(', ')}`,
        relevanceScore: relevance.score,
        matchedKeywords: relevance.matchedKeywords,
        topicCategories: relevance.categories,
        primaryTopic: classification.primary,
        cfrCitations: relevance.cfrCitations,
        caseNames: relevance.caseNames,
        discoveredAt: new Date().toISOString(),
        bvaData: {
          query: result.query,
          totalResults: result.count,
          topUrls: result.urls.slice(0, 5),
          caseNumbers: result.case_numbers?.slice(0, 5) || [],
        },
      });
    }

    log(`  ${scoredItems.length} items from BVA API batch search`);
  } catch (err) {
    log(`  BVA API ERROR: ${err.message}`);
    // Fall back to basic health check
    try {
      const rawText = await fetchWithTimeout(`${source.url}/health`);
      log(`  BVA API health check: ${rawText.slice(0, 100)}`);
    } catch {
      log(`  BVA API appears to be down`);
    }
  }

  return scoredItems;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Load sources config
  let sourcesConfig;
  try {
    const raw = await readFile(SOURCES_PATH, 'utf-8');
    sourcesConfig = JSON.parse(raw);
  } catch (err) {
    log(`FATAL: Could not read sources config: ${err.message}`);
    process.exit(1);
  }

  let sources = sourcesConfig.sources;

  // Filter to single source if specified
  if (args.source) {
    sources = sources.filter(s => s.id === args.source);
    if (sources.length === 0) {
      log(`FATAL: No source found with id "${args.source}"`);
      log(`Available sources: ${sourcesConfig.sources.map(s => s.id).join(', ')}`);
      process.exit(1);
    }
  }

  log(`Processing ${sources.length} source(s)...`);

  // Process all sources, collecting results
  const allItems = [];
  for (const source of sources) {
    try {
      let items;
      if (source.type === 'bva-api') {
        items = await processBVAAPISource(source);
      } else {
        items = await processSource(source);
      }
      allItems.push(...items);
    } catch (err) {
      log(`UNEXPECTED ERROR processing ${source.id}: ${err.message}`);
      // Continue with remaining sources
    }
  }

  // Sort all items by relevance score
  allItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

  log(`\nTotal discovered items: ${allItems.length}`);
  log(`Top relevance scores: ${allItems.slice(0, 5).map(i => `${i.relevanceScore} (${i.title.slice(0, 50)})`).join(', ')}`);

  // Output JSON to stdout
  process.stdout.write(JSON.stringify(allItems, null, 2) + '\n');
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
