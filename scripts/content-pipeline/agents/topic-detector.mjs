#!/usr/bin/env node

/**
 * topic-detector.mjs - Topic clustering and trend detection agent.
 *
 * Takes discovered items from source-monitor output and groups them into
 * topic clusters, identifies trending topics, detects breaking news,
 * and outputs ranked topic clusters with story ideas.
 *
 * Usage:
 *   node source-monitor.mjs | node topic-detector.mjs              # Pipe from source monitor
 *   node topic-detector.mjs --file output/discovered-items.json     # Read from file
 *   node topic-detector.mjs --help
 *
 * Output: JSON array of ranked topic clusters to stdout.
 */

import { readFile } from 'node:fs/promises';
import { keywordSimilarity, classifyTopic, extractEntities } from '../lib/keywords.mjs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SIMILARITY_THRESHOLD = 0.25;         // Minimum Jaccard similarity to cluster together
const BREAKING_NEWS_HOURS = 24;            // Items within this window from reliable sources = breaking
const BREAKING_NEWS_MIN_RELIABILITY = 8;   // Minimum source reliability for breaking news
const TRENDING_MIN_SOURCES = 2;            // Minimum distinct sources for a topic to be "trending"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  process.stderr.write(`[topic-detector] ${msg}\n`);
}

function parseArgs(argv) {
  const args = { file: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true;
    } else if (argv[i] === '--file' && argv[i + 1]) {
      args.file = argv[++i];
    }
  }
  return args;
}

function printHelp() {
  process.stderr.write(`
topic-detector.mjs - Cluster discovered items into topics and detect trends.

Usage:
  node source-monitor.mjs | node topic-detector.mjs
  node topic-detector.mjs --file <path-to-items.json>

Options:
  --file <path>   Read discovered items from a JSON file instead of stdin
  --help, -h      Show this help message

Input:  JSON array of discovered items (from source-monitor).
Output: JSON array of ranked topic clusters to stdout.
`);
}

/**
 * Read JSON from stdin.
 */
async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(chunks.join('')));
      } catch (err) {
        reject(new Error(`Failed to parse stdin as JSON: ${err.message}`));
      }
    });
    process.stdin.on('error', reject);

    // If stdin is a TTY (no piped data), resolve empty after a short delay
    if (process.stdin.isTTY) {
      resolve([]);
    }
  });
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

function overlapRatio(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const value of a) {
    if (b.has(value)) shared++;
  }
  return shared / Math.min(a.size, b.size);
}

function normalizeCaseNames(names = []) {
  return new Set(names.map(name => String(name).toLowerCase()));
}

function normalizeCitations(citations = []) {
  return new Set(citations.map(cite => String(cite).toLowerCase()));
}

function getItemProfile(item) {
  return {
    text: `${item.title} ${item.snippet || ''}`,
    keywords: new Set((item.matchedKeywords || []).map(k => k.toLowerCase())),
    topics: new Set((item.topicCategories || []).map(t => t.toLowerCase())),
    cfrCitations: normalizeCitations(item.cfrCitations || []),
    caseNames: normalizeCaseNames(item.caseNames || []),
    primaryTopic: item.primaryTopic || null,
  };
}

function buildClusterProfile(cluster) {
  const keywords = new Set();
  const topics = new Set();
  const cfrCitations = new Set();
  const caseNames = new Set();

  for (const item of cluster) {
    const profile = getItemProfile(item);
    for (const value of profile.keywords) keywords.add(value);
    for (const value of profile.topics) topics.add(value);
    for (const value of profile.cfrCitations) cfrCitations.add(value);
    for (const value of profile.caseNames) caseNames.add(value);
  }

  return {
    text: cluster.map(item => `${item.title} ${item.snippet || ''}`).join(' '),
    keywords,
    topics,
    cfrCitations,
    caseNames,
    primaryTopics: new Set(cluster.map(item => item.primaryTopic).filter(Boolean)),
  };
}

function canJoinCluster(item, cluster) {
  if (cluster.length === 0) return true;

  const itemProfile = getItemProfile(item);
  const clusterProfile = buildClusterProfile(cluster);
  const similarities = cluster.map(existing => keywordSimilarity(itemProfile.text, `${existing.title} ${existing.snippet || ''}`));
  const maxSimilarity = Math.max(...similarities);
  const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;

  const keywordOverlap = overlapRatio(itemProfile.keywords, clusterProfile.keywords);
  const topicOverlap = overlapRatio(itemProfile.topics, clusterProfile.topics);
  const cfrOverlap = overlapRatio(itemProfile.cfrCitations, clusterProfile.cfrCitations);
  const caseOverlap = overlapRatio(itemProfile.caseNames, clusterProfile.caseNames);
  const samePrimaryTopic = itemProfile.primaryTopic && clusterProfile.primaryTopics.has(itemProfile.primaryTopic);
  const strongEntityMatch = cfrOverlap > 0 || caseOverlap > 0;

  if (strongEntityMatch && maxSimilarity >= 0.12) return true;
  if (samePrimaryTopic && keywordOverlap >= 0.35 && maxSimilarity >= 0.18) return true;
  if (topicOverlap >= 0.5 && avgSimilarity >= 0.18) return true;
  if (avgSimilarity >= SIMILARITY_THRESHOLD && maxSimilarity >= 0.35) return true;

  return false;
}

/**
 * Cluster items using compatibility-based assignment instead of single-linkage.
 * This avoids "bridge" items merging unrelated topics into one large cluster.
 *
 * @param {object[]} items - Discovered items from source monitor.
 * @returns {object[][]} Array of clusters (each cluster is an array of items).
 */
function clusterItems(items) {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  const clusters = [];

  for (const item of sorted) {
    let bestCluster = null;
    let bestScore = -1;

    for (const cluster of clusters) {
      if (!canJoinCluster(item, cluster)) continue;

      const score = cluster.reduce(
        (sum, existing) => sum + keywordSimilarity(`${item.title} ${item.snippet || ''}`, `${existing.title} ${existing.snippet || ''}`),
        0
      ) / cluster.length;

      if (score > bestScore) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.push(item);
    } else {
      clusters.push([item]);
    }
  }

  return clusters;
}

// ---------------------------------------------------------------------------
// Scoring & analysis
// ---------------------------------------------------------------------------

/**
 * Score a topic cluster on multiple dimensions.
 */
function scoreCluster(cluster) {
  const now = Date.now();

  // Recency: how recent are the items?
  let recencyScore = 0;
  let parsedDates = 0;
  for (const item of cluster) {
    if (item.date) {
      const itemTime = new Date(item.date).getTime();
      if (!isNaN(itemTime)) {
        const hoursAgo = (now - itemTime) / (1000 * 60 * 60);
        // Score: 100 for < 1 hour, decaying over 7 days
        recencyScore += Math.max(0, 100 - (hoursAgo / 168) * 100);
        parsedDates++;
      }
    }
  }
  recencyScore = parsedDates > 0 ? recencyScore / parsedDates : 20; // Default 20 if no dates

  // Source count: how many distinct sources cover this topic?
  const uniqueSources = new Set(cluster.map(i => i.sourceId));
  const sourceCountScore = Math.min(uniqueSources.size * 20, 100);

  // Source reliability: average reliability of covering sources
  const avgReliability = cluster.reduce((sum, i) => sum + (i.sourceReliability || 5), 0) / cluster.length;
  const reliabilityScore = avgReliability * 10;

  // Relevance: average relevance score from source monitor
  const avgRelevance = cluster.reduce((sum, i) => sum + (i.relevanceScore || 0), 0) / cluster.length;

  // Veteran impact: presence of high-impact keywords
  const allText = cluster.map(i => `${i.title} ${i.snippet || ''}`).join(' ').toLowerCase();
  let impactScore = 0;
  const highImpactTerms = [
    'rating change', 'new regulation', 'final rule', 'proposed rule',
    'pact act', 'presumptive', 'backlog', 'wait time', 'effective date',
    'benefit increase', 'cost of living', 'cola', 'tdiu', 'smc',
    'camp lejeune', 'burn pit', 'toxic exposure', 'class action',
    'settlement', 'legislation', 'bill passed', 'signed into law',
  ];
  for (const term of highImpactTerms) {
    if (allText.includes(term)) impactScore += 10;
  }
  impactScore = Math.min(impactScore, 100);

  // Composite score (weighted)
  const composite = Math.round(
    recencyScore * 0.25 +
    sourceCountScore * 0.20 +
    reliabilityScore * 0.15 +
    avgRelevance * 0.25 +
    impactScore * 0.15
  );

  return {
    composite,
    recency: Math.round(recencyScore),
    sourceCount: uniqueSources.size,
    sourceCountScore: Math.round(sourceCountScore),
    avgReliability: Math.round(avgReliability * 10) / 10,
    reliabilityScore: Math.round(reliabilityScore),
    avgRelevance: Math.round(avgRelevance),
    impactScore: Math.round(impactScore),
  };
}

/**
 * Determine if a cluster represents breaking news.
 */
function isBreakingNews(cluster) {
  const now = Date.now();
  const cutoff = now - BREAKING_NEWS_HOURS * 60 * 60 * 1000;

  return cluster.some(item => {
    if (!item.date) return false;
    const itemTime = new Date(item.date).getTime();
    return !isNaN(itemTime) &&
      itemTime > cutoff &&
      (item.sourceReliability || 0) >= BREAKING_NEWS_MIN_RELIABILITY;
  });
}

/**
 * Determine if a cluster represents a trending topic.
 */
function isTrending(cluster) {
  const uniqueSources = new Set(cluster.map(i => i.sourceId));
  return uniqueSources.size >= TRENDING_MIN_SOURCES;
}

/**
 * Generate story ideas for a topic cluster.
 */
function generateStoryIdeas(cluster, classification) {
  const ideas = [];
  const primaryTopic = classification.primary;
  const allKeywords = [...new Set(cluster.flatMap(i => i.matchedKeywords || []))];
  const topKeywords = allKeywords.slice(0, 5);

  // Generate ideas based on topic type
  if (primaryTopic === 'regulations') {
    ideas.push(`Explainer: What the new VA regulation means for your disability claim`);
    ideas.push(`Analysis: How ${topKeywords[0] || 'the regulation change'} affects current claimants`);
    ideas.push(`Guide update: Steps to take before the rule takes effect`);
  } else if (primaryTopic === 'legal') {
    ideas.push(`CAVC case analysis: Implications for veteran disability claims`);
    ideas.push(`Legal explainer: How this decision changes the appeals landscape`);
  } else if (primaryTopic === 'appeals') {
    ideas.push(`Appeals strategy guide: What this means for your pending appeal`);
    ideas.push(`Analysis: Changes to the VA appeals process`);
  } else if (primaryTopic === 'ratings') {
    ideas.push(`Rating guide: Understanding the impact on disability ratings`);
    ideas.push(`Calculator update: How VA math applies to the new changes`);
  } else if (primaryTopic === 'conditions') {
    ideas.push(`Condition spotlight: Filing a claim for ${topKeywords[0] || 'this condition'}`);
    ideas.push(`Medical evidence guide: What you need for your C&P exam`);
  } else if (primaryTopic === 'benefits') {
    ideas.push(`Benefits update: What veterans need to know now`);
    ideas.push(`Action guide: Steps to maximize your VA benefits`);
  }

  // Universal ideas
  ideas.push(`News roundup: ${cluster[0]?.title?.slice(0, 60) || 'Latest VA developments'}`);

  return ideas;
}

// ---------------------------------------------------------------------------
// Build topic clusters
// ---------------------------------------------------------------------------

function buildTopicClusters(items) {
  log(`Clustering ${items.length} items...`);

  const clusters = clusterItems(items);
  log(`Found ${clusters.length} raw clusters`);

  const topicClusters = [];

  for (const cluster of clusters) {
    // Combine all text for classification
    const combinedText = cluster.map(i => `${i.title} ${i.snippet || ''}`).join(' ');
    const classification = classifyTopic(combinedText);
    const entities = extractEntities(combinedText);
    const scores = scoreCluster(cluster);
    const breaking = isBreakingNews(cluster);
    const trending = isTrending(cluster);

    // Representative title: use the highest-relevance item's title
    const sortedByRelevance = [...cluster].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    const representativeTitle = sortedByRelevance[0]?.title || 'Unknown Topic';

    // Unique sources
    const uniqueSources = [...new Set(cluster.map(i => i.sourceId))];
    const uniqueSourceNames = [...new Set(cluster.map(i => i.sourceName))];

    // All matched keywords
    const allKeywords = [...new Set(cluster.flatMap(i => i.matchedKeywords || []))];

    // Story ideas
    const storyIdeas = generateStoryIdeas(cluster, classification);

    topicClusters.push({
      clusterId: `cluster-${topicClusters.length + 1}`,
      representativeTitle,
      itemCount: cluster.length,
      isBreaking: breaking,
      isTrending: trending,
      scores,
      classification: {
        primary: classification.primary,
        secondary: classification.secondary,
      },
      keywords: allKeywords,
      entities: {
        cfrCitations: entities.cfrCitations,
        caseNames: entities.caseNames,
      },
      sources: uniqueSourceNames,
      sourceIds: uniqueSources,
      storyIdeas,
      items: cluster.map(item => ({
        id: item.id,
        title: item.title,
        url: item.url,
        date: item.date,
        sourceId: item.sourceId,
        sourceName: item.sourceName,
        relevanceScore: item.relevanceScore,
      })),
    });
  }

  // Sort by composite score descending
  topicClusters.sort((a, b) => b.scores.composite - a.scores.composite);

  // Assign ranks
  topicClusters.forEach((cluster, idx) => {
    cluster.rank = idx + 1;
  });

  return topicClusters;
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

  // Load items from file or stdin
  let items;
  if (args.file) {
    log(`Reading items from file: ${args.file}`);
    try {
      const raw = await readFile(args.file, 'utf-8');
      items = JSON.parse(raw);
    } catch (err) {
      log(`FATAL: Could not read file: ${err.message}`);
      process.exit(1);
    }
  } else {
    log('Reading items from stdin...');
    items = await readStdin();
  }

  if (!Array.isArray(items) || items.length === 0) {
    log('No items to process. Output empty array.');
    process.stdout.write('[]\n');
    process.exit(0);
  }

  log(`Received ${items.length} items to analyze`);

  const topicClusters = buildTopicClusters(items);

  // Summary to stderr
  const breakingCount = topicClusters.filter(c => c.isBreaking).length;
  const trendingCount = topicClusters.filter(c => c.isTrending).length;

  log(`\nResults:`);
  log(`  Total topic clusters: ${topicClusters.length}`);
  log(`  Breaking news: ${breakingCount}`);
  log(`  Trending topics: ${trendingCount}`);
  log(`  Top clusters:`);
  for (const cluster of topicClusters.slice(0, 5)) {
    const flags = [
      cluster.isBreaking ? 'BREAKING' : null,
      cluster.isTrending ? 'TRENDING' : null,
    ].filter(Boolean).join(', ');
    log(`    #${cluster.rank} [${cluster.scores.composite}] ${cluster.representativeTitle.slice(0, 60)}${flags ? ` (${flags})` : ''}`);
  }

  // Output JSON to stdout
  process.stdout.write(JSON.stringify(topicClusters, null, 2) + '\n');
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
