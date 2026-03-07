#!/usr/bin/env node

/**
 * research-compiler.mjs - Research dossier compilation agent.
 *
 * Takes a topic cluster (from topic-detector output) and compiles a structured
 * research dossier/packet for content creation.
 *
 * Usage:
 *   node topic-detector.mjs | node research-compiler.mjs                          # Pipe clusters, compile top
 *   node research-compiler.mjs --file output/topic-clusters.json                  # Read from file
 *   node research-compiler.mjs --file output/topic-clusters.json --cluster 1      # Specific cluster by rank
 *   node research-compiler.mjs --file output/topic-clusters.json --all            # Compile all clusters
 *   node research-compiler.mjs --topic "PACT Act toxic exposure presumptives"     # Ad-hoc topic
 *   node research-compiler.mjs --help
 *
 * Output: Saves dossier JSON to scripts/content-pipeline/output/research/ and
 *         prints the dossier to stdout.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractEntities, scoreRelevance, classifyTopic, KEYWORDS } from '../lib/keywords.mjs';
import { researchTopic, verifyCAVCCase, cavcSearch, cavcCaseSummary, cavcDocket } from '../lib/bva-api-client.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, '..', 'output', 'research');

// ---------------------------------------------------------------------------
// Well-known CFR sections relevant to VA disability claims
// ---------------------------------------------------------------------------

const KNOWN_CFR_SECTIONS = {
  '3.1': 'Definitions',
  '3.4': 'Compensation',
  '3.102': 'Benefit of the doubt',
  '3.103': 'Procedural due process',
  '3.156': 'New and material evidence',
  '3.159': 'Duty to assist',
  '3.303': 'Service connection - general',
  '3.304': 'Service connection - direct',
  '3.307': 'Presumptive service connection - general',
  '3.309': 'Presumptive conditions',
  '3.310': 'Secondary service connection',
  '3.317': 'Gulf War presumptives',
  '3.320': 'Concurrent claims',
  '3.340': 'Total disability ratings - general',
  '3.341': 'Total disability ratings - procedures',
  '3.343': 'Protected ratings / continuance',
  '3.344': 'Rating reductions - stabilization',
  '3.400': 'Effective dates',
  '3.951': 'Preservation of disability ratings',
  '4.1': 'Rating schedule essentials',
  '4.3': 'Resolution of reasonable doubt',
  '4.7': 'Higher of two evaluations',
  '4.10': 'Functional impairment',
  '4.16': 'TDIU',
  '4.25': 'Combined ratings table',
  '4.26': 'Bilateral factor',
  '4.40': 'Functional loss',
  '4.45': 'Joint examination',
  '4.59': 'Painful motion',
  '4.71a': 'Musculoskeletal ratings',
  '4.85': 'Hearing impairment evaluation',
  '4.86': 'Exceptional hearing impairment',
  '4.87': 'Ear conditions',
  '4.104': 'Cardiovascular conditions',
  '4.118': 'Skin conditions',
  '4.125': 'Mental disorders - diagnosis',
  '4.126': 'Mental disorders - evaluation',
  '4.130': 'Mental disorders - rating schedule',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  process.stderr.write(`[research-compiler] ${msg}\n`);
}

function parseArgs(argv) {
  const args = { file: null, cluster: null, all: false, topic: null, help: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true;
    } else if (argv[i] === '--file' && argv[i + 1]) {
      args.file = argv[++i];
    } else if (argv[i] === '--cluster' && argv[i + 1]) {
      args.cluster = parseInt(argv[++i], 10);
    } else if (argv[i] === '--all') {
      args.all = true;
    } else if (argv[i] === '--topic' && argv[i + 1]) {
      args.topic = argv[++i];
    }
  }
  return args;
}

function printHelp() {
  process.stderr.write(`
research-compiler.mjs - Compile research dossiers from topic clusters.

Usage:
  node topic-detector.mjs | node research-compiler.mjs
  node research-compiler.mjs --file <clusters.json> [--cluster <rank>] [--all]
  node research-compiler.mjs --topic "PACT Act toxic exposure"

Options:
  --file <path>      Read topic clusters from a JSON file
  --cluster <rank>   Compile dossier for specific cluster by rank (default: 1 / top)
  --all              Compile dossiers for all clusters
  --topic <text>     Compile a dossier from an ad-hoc topic description
  --help, -h         Show this help message

Output: Dossier JSON saved to output/research/ and printed to stdout.
`);
}

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
    if (process.stdin.isTTY) {
      resolve([]);
    }
  });
}

function sanitizeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function resolveStyleProfile(articleType) {
  const normalized = String(articleType || '').toLowerCase();
  if (['cavc-analysis', 'policy-update', 'claims-strategy', 'explainer', 'opinion', 'news'].includes(normalized)) {
    return normalized;
  }
  return 'claims-intel-default';
}

function hasUnverifiedCAVCClaim(text) {
  return /\bcavc\b/i.test(text || '') && /\b(ruling|decision|opinion|case)\b/i.test(text || '');
}

function normalizeGenericTopicTitle(text, fallback = 'Sleep apnea nexus letters') {
  const cleaned = (text || '')
    .trim()
    .replace(/^(on|of|for|about)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 8) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function looksLikeCAVCCaseTopic(dossier) {
  const haystack = [
    dossier.topic?.title || '',
    ...(dossier.keyFacts || []).map((fact) => fact.fact || ''),
    ...(dossier.suggestedTitles || []),
  ].join(' ');
  return /\bcavc\b/i.test(haystack) || /\bvet\.?\s*app\.?\b/i.test(haystack) || (dossier.relatedCAVCCases?.length || 0) > 0;
}

function extractCAVCSearchTerm(dossier) {
  const namedCase = dossier.relatedCAVCCases?.[0]?.caseName;
  if (namedCase) {
    return namedCase.split(' v.')[0].trim();
  }

  const title = dossier.topic?.title || '';
  const withoutLead = title
    .replace(/\bcavc\b/ig, '')
    .replace(/\b(ruling|decision|opinion|case)\b/ig, '')
    .replace(/\b(on|of|for|about)\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutLead) return withoutLead;
  return null;
}

function summarizeDocketEntries(docketEntries, limit = 5) {
  return (docketEntries || []).slice(0, limit).map((entry) => ({
    date: entry.date || null,
    text: entry.text || '',
    documentUrl: entry.doc_url || null,
  }));
}

async function enrichWithCAVCData(dossier) {
  if (!looksLikeCAVCCaseTopic(dossier)) return dossier;

  const searchTerm = extractCAVCSearchTerm(dossier);
  if (!searchTerm) return dossier;

  log(`  Searching CAVC endpoint for: "${searchTerm}"`);

  try {
    const searchResults = await cavcSearch({ partyName: searchTerm });
    const matches = Array.isArray(searchResults) ? searchResults : searchResults?.results || [];
    if (!matches.length) {
      dossier.cavcResearch = {
        query: searchTerm,
        matched: false,
        note: 'No CAVC case matched the topic query.',
      };
      return dossier;
    }

    const match = matches[0];
    const [summary, docket] = await Promise.all([
      cavcCaseSummary(match.case_number),
      cavcDocket(match.case_number),
    ]);

    dossier.cavcResearch = {
      query: searchTerm,
      matched: true,
      caseNumber: match.case_number,
      title: match.title,
      openingDate: match.opening_date || summary?.docketed || null,
      summary: {
        appealFrom: summary?.appeal_from || null,
        feeStatus: summary?.fee_status || null,
        caseType: summary?.case_type || null,
        docketEntriesCount: summary?.docket_entries_count || docket?.docket_entries?.length || 0,
      },
      parties: docket?.parties || summary?.parties || [],
      recentDocketEntries: summarizeDocketEntries(docket?.docket_entries),
    };

    const existingIndex = (dossier.relatedCAVCCases || []).findIndex((entry) => {
      const caseName = entry?.caseName || '';
      return caseName === match.title || caseName.split(' v.')[0].trim().toLowerCase() === searchTerm.toLowerCase();
    });

    const enrichedCase = {
      caseName: match.title,
      source: existingIndex >= 0 ? dossier.relatedCAVCCases[existingIndex].source : 'cavc-endpoint',
      verified: true,
      efilingData: {
        caseNumber: match.case_number,
        title: match.title,
        openingDate: match.opening_date || summary?.docketed || null,
      },
      docketEntries: summarizeDocketEntries(docket?.docket_entries, 8),
    };

    if (existingIndex >= 0) {
      dossier.relatedCAVCCases[existingIndex] = {
        ...dossier.relatedCAVCCases[existingIndex],
        ...enrichedCase,
      };
    } else {
      dossier.relatedCAVCCases = [enrichedCase, ...(dossier.relatedCAVCCases || [])];
    }

    if (dossier.suggestedArticleType !== 'cavc-analysis') {
      dossier.suggestedArticleTypes = [
        {
          type: 'cavc-analysis',
          priority: 'high',
          description: 'Case-driven analysis of a verified CAVC appeal',
          reason: `Verified CAVC case ${match.case_number} was found via the court docket endpoint.`,
        },
        ...(dossier.suggestedArticleTypes || []).filter((entry) => entry.type !== 'cavc-analysis'),
      ];
      dossier.suggestedArticleType = 'cavc-analysis';
    }

    log(`    CAVC match: ${match.title} -> ${match.case_number}`);
  } catch (err) {
    log(`    CAVC enrichment failed: ${err.message}`);
    dossier.cavcResearch = {
      query: searchTerm,
      matched: false,
      error: err.message,
    };
  }

  return dossier;
}

function getVerifiedCaseRecord(dossier) {
  return dossier.relatedCAVCCases?.find((entry) => entry?.verified && entry?.efilingData?.caseNumber) || null;
}

function applyCaseSupportGuardrails(dossier) {
  const verifiedCase = getVerifiedCaseRecord(dossier);
  const hasNamedCase = (dossier.relatedCAVCCases?.length || 0) > 0;
  const hasVerifiedCase = Boolean(verifiedCase);
  const unverifiedCaseClaim = hasUnverifiedCAVCClaim(dossier.topic?.title)
    || (dossier.suggestedTitles || []).some((title) => hasUnverifiedCAVCClaim(title));

  dossier.caseSupport = {
    hasNamedCase,
    hasVerifiedCase,
    canClaimSpecificCAVCRuling: hasVerifiedCase,
    verifiedCaseName: verifiedCase?.caseName || null,
    verifiedCaseNumber: verifiedCase?.efilingData?.caseNumber || null,
  };

  if (!hasVerifiedCase && unverifiedCaseClaim) {
    dossier.editorialWarnings = [
      ...(dossier.editorialWarnings || []),
      'Do not frame this as a specific CAVC ruling unless a named case and docket are verified.',
    ];

    dossier.topic.summary += ' No specific CAVC case name or docket has been verified yet.';

    dossier.suggestedTitles = [
      ...(dossier.suggestedTitles || []).filter((title) => !hasUnverifiedCAVCClaim(title)),
    ];

    if ((dossier.suggestedTitles || []).length === 0) {
      dossier.suggestedTitles = ['Sleep apnea nexus letters: What Veterans Need to Know'];
    }

    if (hasUnverifiedCAVCClaim(dossier.topic.title)) {
      dossier.topic.title = normalizeGenericTopicTitle(dossier.topic.title
        .replace(/\bcavc\b/ig, '')
        .replace(/\b(ruling|decision|opinion|case)\b/ig, '')
      );
    }

    if (dossier.suggestedArticleType === 'cavc-analysis') {
      dossier.suggestedArticleType = 'explainer';
      dossier.suggestedArticleTypes = [
        { type: 'explainer', priority: 'high', description: 'Plain-language explainer of the topic', reason: 'A specific CAVC case was not verified, so case-law analysis is not supported.' },
        ...(dossier.suggestedArticleTypes || []).filter((entry) => entry.type !== 'cavc-analysis' && entry.type !== 'explainer'),
      ];
    }
  }

  return dossier;
}

// ---------------------------------------------------------------------------
// Dossier compilation
// ---------------------------------------------------------------------------

/**
 * Find related CFR sections based on the topic's keywords.
 */
function findRelatedCFR(keywords, cfrCitations) {
  const related = [];

  // Include any directly cited CFR sections
  for (const cite of cfrCitations) {
    const sectionNum = cite.replace('38 CFR ', '');
    const description = KNOWN_CFR_SECTIONS[sectionNum] || 'Referenced in source material';
    related.push({ section: cite, description, source: 'direct citation' });
  }

  // Infer related CFR sections from keywords
  const lower = keywords.map(k => k.toLowerCase());

  const inferenceRules = [
    { keywords: ['service connection', 'service-connected', 'direct service connection'], cfr: '3.303', desc: 'Service connection - general' },
    { keywords: ['secondary service connection', 'secondary condition', 'aggravation'], cfr: '3.310', desc: 'Secondary service connection' },
    { keywords: ['presumptive', 'presumptive condition', 'presumptive service connection'], cfr: '3.309', desc: 'Presumptive conditions' },
    { keywords: ['gulf war', 'gulf war illness', 'southwest asia'], cfr: '3.317', desc: 'Gulf War presumptives' },
    { keywords: ['tdiu', 'individual unemployability', 'unemployability'], cfr: '4.16', desc: 'TDIU' },
    { keywords: ['total disability', 'permanent and total', 'p&t'], cfr: '3.340', desc: 'Total disability ratings' },
    { keywords: ['rating reduction', 'proposed reduction'], cfr: '3.344', desc: 'Rating reductions / stabilization' },
    { keywords: ['protected rating', 'static disability'], cfr: '3.951', desc: 'Preservation of ratings' },
    { keywords: ['effective date', 'retroactive'], cfr: '3.400', desc: 'Effective dates' },
    { keywords: ['new and material', 'reopened claim', 'supplemental claim'], cfr: '3.156', desc: 'New and material evidence' },
    { keywords: ['duty to assist', 'va duty'], cfr: '3.159', desc: 'Duty to assist' },
    { keywords: ['benefit of the doubt'], cfr: '3.102', desc: 'Benefit of the doubt' },
    { keywords: ['combined rating', 'va math', 'bilateral factor'], cfr: '4.25', desc: 'Combined ratings table' },
    { keywords: ['ptsd', 'mental disorder', 'depression', 'anxiety'], cfr: '4.130', desc: 'Mental disorders rating schedule' },
    { keywords: ['hearing loss', 'tinnitus'], cfr: '4.85', desc: 'Hearing impairment evaluation' },
    { keywords: ['smc', 'special monthly compensation', 'aid and attendance', 'housebound'], cfr: '3.350', desc: 'Special monthly compensation' },
    { keywords: ['nexus letter', 'nexus opinion', 'medical evidence'], cfr: '3.159', desc: 'Duty to assist / medical evidence' },
    { keywords: ['c&p exam', 'compensation and pension', 'va examination'], cfr: '3.159', desc: 'VA examination duty' },
  ];

  const addedSections = new Set(cfrCitations.map(c => c.replace('38 CFR ', '')));
  for (const rule of inferenceRules) {
    if (rule.keywords.some(k => lower.includes(k))) {
      if (!addedSections.has(rule.cfr)) {
        addedSections.add(rule.cfr);
        related.push({ section: `38 CFR ${rule.cfr}`, description: rule.desc, source: 'inferred from keywords' });
      }
    }
  }

  return related;
}

/**
 * Extract key facts from items.
 */
function extractKeyFacts(items) {
  const facts = [];
  for (const item of items) {
    if (item.title) {
      facts.push({
        fact: item.title,
        source: item.sourceName || item.sourceId || 'unknown',
        url: item.url || null,
        date: item.date || null,
        reliability: item.sourceReliability || item.reliability || 5,
      });
    }
    // If snippet contains substantive info, include it
    if (item.snippet && item.snippet.length > 50) {
      facts.push({
        fact: item.snippet.slice(0, 300),
        source: item.sourceName || item.sourceId || 'unknown',
        url: item.url || null,
        date: item.date || null,
        reliability: item.sourceReliability || item.reliability || 5,
      });
    }
  }
  // Deduplicate by fact text
  const seen = new Set();
  return facts.filter(f => {
    const key = f.fact.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build a timeline from items with dates.
 */
function buildTimeline(items) {
  const events = [];
  for (const item of items) {
    if (item.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        events.push({
          date: d.toISOString().split('T')[0],
          event: item.title || 'Unknown event',
          source: item.sourceName || item.sourceId || 'unknown',
          url: item.url || null,
        });
      }
    }
  }
  // Sort chronologically
  events.sort((a, b) => a.date.localeCompare(b.date));
  // Deduplicate
  const seen = new Set();
  return events.filter(e => {
    const key = `${e.date}-${e.event.slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Assess veteran impact level.
 */
function assessVeteranImpact(keywords, classification, scores) {
  const factors = [];
  let level = 'moderate'; // low, moderate, high, critical

  const lower = keywords.map(k => k.toLowerCase());

  // Critical impact indicators
  const criticalTerms = ['final rule', 'new regulation', 'legislation', 'signed into law', 'presumptive', 'pact act'];
  if (criticalTerms.some(t => lower.includes(t))) {
    level = 'critical';
    factors.push('Regulatory or legislative change directly affects eligibility or benefits');
  }

  // High impact indicators
  const highTerms = ['proposed rule', 'rating change', 'tdiu', 'backlog', 'class action', 'settlement'];
  if (highTerms.some(t => lower.includes(t))) {
    if (level !== 'critical') level = 'high';
    factors.push('Potential changes to disability ratings, processing, or benefits amounts');
  }

  // Rating-related topics are high impact
  if (classification.primary === 'ratings' || classification.primary === 'regulations') {
    if (level !== 'critical') level = 'high';
    factors.push(`Topic directly relates to ${classification.primary}`);
  }

  // Multiple sources = higher impact
  if (scores.sourceCount >= 3) {
    factors.push(`Covered by ${scores.sourceCount} sources, indicating broad significance`);
  }

  // Low impact indicators
  if (classification.primary === 'community' && scores.avgReliability < 5) {
    level = 'low';
    factors.push('Community discussion without official source confirmation');
  }

  return { level, factors };
}

/**
 * Suggest article types based on the topic.
 */
function suggestArticleTypes(classification, impact, isBreaking, isTrending) {
  const types = [];
  const addType = (type, priority, description, reason) => {
    if (types.some(entry => entry.type === type)) return;
    types.push({ type, priority, description, reason });
  };

  if (isBreaking) {
    addType(
      'news',
      'immediate',
      'Time-sensitive news article covering the development',
      'Cluster is flagged as breaking and should map to the generator-supported news format.'
    );
  }

  if (classification.primary === 'legal') {
    addType(
      'cavc-analysis',
      'high',
      'In-depth analysis of the legal change, decision, and downstream claim implications',
      'Primary topic is legal, so the supported CAVC/legal analysis format is the closest fit.'
    );
    addType(
      'explainer',
      'high',
      'Plain-language explainer of what the decision means for veterans',
      'Legal developments often need an explainer companion piece.'
    );
  } else if (classification.primary === 'regulations') {
    addType(
      'policy-update',
      'high',
      'Analysis of the regulatory or policy change and its practical impact',
      'Primary topic is regulations, which maps to the policy-update generator.'
    );
    addType(
      'explainer',
      'medium',
      'Plain-language explainer of the policy change for veterans',
      'Regulatory changes often warrant an explainer follow-up.'
    );
  } else if (classification.primary === 'appeals' || classification.primary === 'claims' || classification.primary === 'ratings') {
    addType(
      'claims-strategy',
      impact.level === 'critical' || impact.level === 'high' ? 'high' : 'medium',
      'Tactical guide covering the best response or filing strategy for veterans',
      'Appeals, claims, and rating topics align with the claims-strategy format.'
    );
  }

  if (impact.level === 'critical' || impact.level === 'high') {
    addType(
      'claims-strategy',
      'high',
      'Step-by-step response guide for veterans affected by the development',
      'High-impact topics should produce actionable guidance in a supported format.'
    );
  }

  if (isTrending) {
    addType(
      'news',
      'medium',
      'News-style synthesis of a trending topic covered by multiple sources',
      'Trending multi-source coverage fits the supported news format.'
    );
  }

  if (classification.primary === 'conditions') {
    addType(
      'explainer',
      'medium',
      'Focused explainer on claiming the specific condition and evidentiary requirements',
      'Condition-specific coverage maps best to the explainer format.'
    );
  }

  if (classification.primary === 'benefits') {
    addType(
      'policy-update',
      'medium',
      'Benefits-focused policy update explaining who is affected and what changes',
      'Benefits topics usually fit policy-update better than unsupported custom types.'
    );
  }

  if (types.length === 0) {
    addType(
      'explainer',
      'medium',
      'General explainer article covering the topic in plain language',
      'Fallback format when the topic does not strongly map to a narrower generator type.'
    );
  }

  return types;
}

/**
 * Generate questions that a content article should answer.
 */
function generateKeyQuestions(keywords, classification, impact) {
  const questions = [];

  // Universal questions
  questions.push('What happened and why does it matter to veterans?');
  questions.push('Which veterans are affected and how?');

  if (classification.primary === 'regulations') {
    questions.push('What specific regulation changed and what was it before?');
    questions.push('When does the change take effect?');
    questions.push('What action should veterans take before the effective date?');
    questions.push('Does this affect pending claims or only new ones?');
  }

  if (classification.primary === 'legal') {
    questions.push('What did the court decide and what was the legal reasoning?');
    questions.push('Is this decision precedential?');
    questions.push('How does this change VA adjudication going forward?');
    questions.push('Should veterans with similar claims file supplemental claims?');
  }

  if (classification.primary === 'appeals') {
    questions.push('How does this affect veterans currently in the appeals process?');
    questions.push('What appeal lane is most appropriate given this development?');
  }

  if (classification.primary === 'ratings') {
    questions.push('How does this change disability rating calculations?');
    questions.push('Are any rating reductions or increases expected?');
  }

  if (impact.level === 'critical' || impact.level === 'high') {
    questions.push('What is the timeline for implementation?');
    questions.push('What should veterans do right now in response?');
    questions.push('Are VSOs or veteran attorneys commenting on this?');
  }

  const lower = keywords.map(k => k.toLowerCase());
  if (lower.includes('pact act') || lower.includes('toxic exposure') || lower.includes('burn pit')) {
    questions.push('Which toxic exposure conditions are covered?');
    questions.push('What is the presumptive period?');
  }

  if (lower.includes('tdiu') || lower.includes('individual unemployability')) {
    questions.push('How does this affect TDIU eligibility criteria?');
    questions.push('Are there changes to the income threshold?');
  }

  return [...new Set(questions)];
}

/**
 * Enrich a dossier with live BVA API data.
 */
async function enrichWithBVAData(dossier) {
  const topicTitle = dossier.topic?.title || '';
  if (!topicTitle) return applyCaseSupportGuardrails(dossier);

  log(`Enriching dossier with BVA API data for: "${topicTitle.slice(0, 60)}"`);

  try {
    dossier = await enrichWithCAVCData(dossier);

    // Search BVA decisions related to the topic
    const bvaResults = await researchTopic(topicTitle, { maxPages: 1, maxCases: 3 });

    if (bvaResults.cases?.length > 0) {
      dossier.bvaResearch = {
        query: bvaResults.topic,
        totalDecisionsFound: bvaResults.totalResults,
        year: bvaResults.year,
        outcomeBreakdown: bvaResults.outcomeBreakdown,
        topCases: bvaResults.cases.map(c => ({
          caseNumber: c.caseNumber,
          url: c.url,
          outcome: c.outcome,
          judge: c.judge,
          issues: c.issues,
          citations: c.citations,
          decisionDate: c.decisionDate,
        })),
        relatedCitations: bvaResults.allCitations,
        relatedIssues: bvaResults.allIssues,
      };

      // Add BVA citations to the existing CFR references
      for (const cite of bvaResults.allCitations) {
        const match = cite.match(/(\d+\.\d+[a-z]?)/);
        if (match) {
          const section = match[1];
          const exists = dossier.relatedCFR.some(r => r.section.includes(section));
          if (!exists) {
            dossier.relatedCFR.push({
              section: cite,
              description: 'Referenced in BVA decision(s)',
              source: 'bva-api',
            });
          }
        }
      }

      log(`  Found ${bvaResults.cases.length} cases, ${bvaResults.allCitations.length} citations`);
    } else {
      log(`  No BVA decisions found for this topic`);
    }
  } catch (err) {
    log(`  BVA API enrichment failed: ${err.message}`);
    dossier.bvaResearch = { error: err.message, note: 'BVA API was unavailable during compilation' };
  }

  // Try to verify CAVC case names mentioned in sources
  if (dossier.relatedCAVCCases?.length > 0) {
    log(`  Verifying ${dossier.relatedCAVCCases.length} CAVC case(s) via eFiling...`);
    for (const cavcCase of dossier.relatedCAVCCases) {
      try {
        const lastName = cavcCase.caseName.split(' v.')[0].trim();
        const verified = await verifyCAVCCase(lastName);
        if (verified) {
          cavcCase.verified = true;
          cavcCase.efilingData = {
            caseNumber: verified.case_number,
            title: verified.title,
            openingDate: verified.opening_date,
          };
          log(`    Verified: ${cavcCase.caseName} -> ${verified.case_number}`);
        } else {
          cavcCase.verified = false;
          log(`    Not found in eFiling: ${cavcCase.caseName}`);
        }
      } catch {
        cavcCase.verified = null; // unknown
      }
    }
  }

  return applyCaseSupportGuardrails(dossier);
}

/**
 * Compile a full research dossier from a topic cluster.
 */
function compileDossier(cluster) {
  const allText = cluster.items
    ? cluster.items.map(i => `${i.title} ${i.snippet || ''}`).join(' ')
    : cluster.representativeTitle || '';

  const entities = extractEntities(allText);
  const classification = cluster.classification || classifyTopic(allText);
  const scores = cluster.scores || { sourceCount: 1, avgReliability: 5 };
  const keywords = cluster.keywords || entities.keywords;
  const isBreaking = cluster.isBreaking || false;
  const isTrending = cluster.isTrending || false;

  const items = cluster.items || [];
  const relatedCFR = findRelatedCFR(keywords, entities.cfrCitations);
  const keyFacts = extractKeyFacts(items);
  const timeline = buildTimeline(items);
  const impact = assessVeteranImpact(keywords, classification, scores);
  const articleTypes = suggestArticleTypes(classification, impact, isBreaking, isTrending);
  const keyQuestions = generateKeyQuestions(keywords, classification, impact);

  // Generate title ideas
  const titleIdeas = cluster.storyIdeas || [];
  if (titleIdeas.length === 0) {
    titleIdeas.push(`${cluster.representativeTitle || 'VA Update'}: What Veterans Need to Know`);
    titleIdeas.push(`Breaking Down the Latest VA ${classification.primary || 'Policy'} Changes`);
  }

  // Build source list
  const sourceList = items.map(item => ({
    title: item.title,
    url: item.url,
    source: item.sourceName || item.sourceId,
    reliability: item.sourceReliability || item.reliability || 5,
    date: item.date || null,
  }));

  const dossier = {
    dossierId: `dossier-${Date.now()}-${sanitizeFilename(cluster.representativeTitle || 'topic')}`,
    compiledAt: new Date().toISOString(),
    topic: {
      title: cluster.representativeTitle || 'Unknown Topic',
      summary: `Topic cluster covering ${items.length} item(s) from ${scores.sourceCount || 1} source(s). ` +
        `Primary category: ${classification.primary || 'general'}. ` +
        `${isBreaking ? 'BREAKING NEWS. ' : ''}` +
        `${isTrending ? 'TRENDING TOPIC. ' : ''}` +
        `Veteran impact: ${impact.level}.`,
      classification,
      isBreaking,
      isTrending,
    },
    scores: {
      composite: scores.composite || 0,
      recency: scores.recency || 0,
      sourceCount: scores.sourceCount || 1,
      avgReliability: scores.avgReliability || 5,
      avgRelevance: scores.avgRelevance || 0,
      impactScore: scores.impactScore || 0,
    },
    sources: sourceList,
    keyFacts,
    relatedCFR,
    relatedCAVCCases: entities.caseNames.map(name => ({
      caseName: name,
      source: 'extracted from source material',
    })),
    timeline,
    veteranImpact: impact,
    suggestedArticleTypes: articleTypes,
    suggestedArticleType: articleTypes[0]?.type || 'explainer',
    styleProfile: resolveStyleProfile(articleTypes[0]?.type),
    suggestedTitles: titleIdeas,
    keyQuestions,
    keywords,
    entities: {
      cfrCitations: entities.cfrCitations,
      uscCitations: entities.uscCitations,
      caseNames: entities.caseNames,
    },
    rawCluster: {
      clusterId: cluster.clusterId || null,
      rank: cluster.rank || null,
      itemCount: items.length,
    },
  };

  return applyCaseSupportGuardrails(dossier);
}

/**
 * Compile a dossier from an ad-hoc topic string.
 */
function compileAdHocDossier(topicText) {
  const entities = extractEntities(topicText);
  const classification = classifyTopic(topicText);
  const relevance = scoreRelevance(topicText);

  const pseudoCluster = {
    representativeTitle: topicText,
    items: [{
      title: topicText,
      url: null,
      date: new Date().toISOString(),
      sourceName: 'manual-input',
      sourceId: 'manual-input',
      sourceReliability: 5,
      snippet: topicText,
    }],
    keywords: relevance.matchedKeywords,
    classification,
    scores: {
      composite: relevance.score,
      sourceCount: 1,
      avgReliability: 5,
      recency: 100,
      avgRelevance: relevance.score,
      impactScore: 0,
    },
    isBreaking: false,
    isTrending: false,
    storyIdeas: [],
  };

  return compileDossier(pseudoCluster);
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

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  let dossiers = [];

  if (args.topic) {
    // Ad-hoc topic mode
    log(`Compiling dossier for ad-hoc topic: "${args.topic}"`);
    let dossier = compileAdHocDossier(args.topic);
    dossier = await enrichWithBVAData(dossier);
    dossiers.push(dossier);
  } else {
    // Load clusters from file or stdin
    let clusters;
    if (args.file) {
      log(`Reading clusters from file: ${args.file}`);
      try {
        const raw = await readFile(args.file, 'utf-8');
        clusters = JSON.parse(raw);
      } catch (err) {
        log(`FATAL: Could not read file: ${err.message}`);
        process.exit(1);
      }
    } else {
      log('Reading clusters from stdin...');
      clusters = await readStdin();
    }

    if (!Array.isArray(clusters) || clusters.length === 0) {
      log('No clusters to process.');
      process.stdout.write('[]\n');
      process.exit(0);
    }

    log(`Received ${clusters.length} clusters`);

    if (args.all) {
      // Compile all clusters
      log('Compiling dossiers for all clusters...');
      for (const cluster of clusters) {
        let dossier = compileDossier(cluster);
        dossier = await enrichWithBVAData(dossier);
        dossiers.push(dossier);
      }
    } else {
      // Compile single cluster (by rank or the top one)
      const targetRank = args.cluster || 1;
      const cluster = clusters.find(c => c.rank === targetRank) || clusters[0];
      if (!cluster) {
        log(`FATAL: No cluster found with rank ${targetRank}`);
        process.exit(1);
      }
      log(`Compiling dossier for cluster #${cluster.rank || 1}: "${cluster.representativeTitle}"`);
      let dossier = compileDossier(cluster);
      dossier = await enrichWithBVAData(dossier);
      dossiers.push(dossier);
    }
  }

  // Save dossiers to files
  for (const dossier of dossiers) {
    const filename = `${dossier.dossierId}.json`;
    const filepath = join(OUTPUT_DIR, filename);
    try {
      await writeFile(filepath, JSON.stringify(dossier, null, 2), 'utf-8');
      log(`Saved dossier: ${filepath}`);
    } catch (err) {
      log(`WARNING: Could not save dossier to ${filepath}: ${err.message}`);
    }
  }

  // Output to stdout
  const output = dossiers.length === 1 ? dossiers[0] : dossiers;
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');

  log(`\nCompiled ${dossiers.length} dossier(s)`);
  for (const d of dossiers) {
    log(`  - ${d.topic.title.slice(0, 60)} | Impact: ${d.veteranImpact.level} | Sources: ${d.sources.length} | CFR refs: ${d.relatedCFR.length}`);
  }
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
