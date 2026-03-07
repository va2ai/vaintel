#!/usr/bin/env node

/**
 * claim-validator.mjs
 *
 * QA agent that scans a draft article for factual claims and validates them
 * using OpenAI API analysis. Checks for unsupported claims, hallucinated
 * statistics, date errors, contradictions, and policy claims without CFR backing.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/claim-validator.mjs <path-to-article.json>
 *   echo '{"body":"..."}' | node scripts/content-pipeline/agents/claim-validator.mjs --stdin
 *
 * Requires: OPENAI_API_KEY environment variable
 *
 * Output: JSON claims report to stdout
 * Status: logged to stderr
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// ---------------------------------------------------------------------------
// Local pre-checks (no API needed)
// ---------------------------------------------------------------------------

/**
 * Extract statistics and percentage claims for scrutiny.
 */
function extractStatistics(text) {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*%/g,                           // percentages
    /(\d{1,3}(?:,\d{3})*)\s+(veterans|claims|cases)/gi, // counts of veterans/claims
    /\b(million|billion|thousand)\s+(veterans|claims|dollars)/gi,
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:out\s+of|in)\s+(?:every\s+)?\w+/gi,
    /\b(\d+)\s+(?:out\s+of|in)\s+(?:every\s+)?(\d+)/gi,
  ];

  const stats = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 60);
      const end = Math.min(text.length, match.index + match[0].length + 60);
      const context = text.slice(start, end).replace(/\n/g, ' ').trim();
      stats.push({
        statistic: match[0],
        context,
        position: match.index,
      });
    }
  }
  return stats;
}

/**
 * Extract date claims for validation.
 */
function extractDateClaims(text) {
  const patterns = [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /\b(in|since|after|before|by|from|until)\s+(\d{4})\b/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    /\b(19|20)\d{2}\b/g,
  ];

  const dates = [];
  const currentYear = new Date().getFullYear();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(start, end).replace(/\n/g, ' ').trim();

      // Extract year for validation
      const yearMatch = match[0].match(/(19|20)\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

      let issue = null;
      if (year) {
        if (year > currentYear + 1) {
          issue = 'FUTURE_DATE_AS_FACT';
        } else if (year < 1900) {
          issue = 'SUSPICIOUSLY_OLD_DATE';
        }
      }

      dates.push({
        dateRef: match[0],
        context,
        year,
        issue,
        position: match.index,
      });
    }
  }

  return dates;
}

/**
 * Extract sentences that make factual assertions without citations nearby.
 */
function extractUnsupportedClaims(text) {
  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);

  // Patterns indicating factual assertions
  const assertionPatterns = [
    /\b(studies?\s+show|research\s+(shows?|indicates?|suggests?))/i,
    /\baccording\s+to\b/i,
    /\b(data|evidence)\s+(shows?|indicates?|suggests?|proves?)/i,
    /\b(is|are|was|were)\s+(required|mandatory|prohibited|forbidden)/i,
    /\bthe\s+VA\s+(requires?|mandates?|prohibits?|allows?|provides?)/i,
    /\b(all|every|no|none)\s+(veterans?|claims?|cases?)/i,
    /\b(must|shall|will)\s+(be|have|provide|submit)/i,
  ];

  // Patterns indicating citation is present
  const citationPatterns = [
    /38\s+C\.?F\.?R\.?/i,
    /38\s+U\.?S\.?C\.?/i,
    /v\.\s+[A-Z]/,
    /VA\s+Form/i,
    /§/,
  ];

  const unsupported = [];

  for (const sentence of sentences) {
    const isAssertion = assertionPatterns.some(p => p.test(sentence));
    if (!isAssertion) continue;

    const hasCitation = citationPatterns.some(p => p.test(sentence));
    if (hasCitation) continue;

    // Check surrounding context (previous and next sentences)
    const idx = text.indexOf(sentence);
    const nearby = text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + sentence.length + 200));
    const nearbyCitation = citationPatterns.some(p => p.test(nearby));

    unsupported.push({
      claim: sentence.trim().slice(0, 200),
      hasCitationNearby: nearbyCitation,
      position: idx,
    });
  }

  return unsupported;
}

// ---------------------------------------------------------------------------
// OpenAI-powered deep analysis
// ---------------------------------------------------------------------------

async function analyzeClaimsWithAI(article) {
  if (!OPENAI_API_KEY) {
    return {
      status: 'SKIPPED',
      message: 'OPENAI_API_KEY not set. AI-powered claim analysis skipped.',
      claims: [],
    };
  }

  const text = article.body || article.content;
  const title = article.title || article.headline || '';

  // Truncate very long articles to fit context
  const truncated = text.length > 12000 ? text.slice(0, 12000) + '\n[...truncated...]' : text;

  const systemPrompt = `You are a rigorous fact-checker for a VA disability claims information website called Veteran2Veteran. Your job is to analyze an article and identify factual claims that may be incorrect, unsupported, or hallucinated.

IMPORTANT CONTEXT:
- This site provides EDUCATIONAL information about VA disability claims
- It must NEVER present hallucinated facts, wrong CFR citations, or incorrect VA policy
- You must be strict and flag anything uncertain

Analyze the article and return a JSON array of claim objects. For each significant factual claim, include:
{
  "claim": "The exact claim text (brief)",
  "category": "one of: cfr_reference, va_policy, statistic, historical_fact, case_law, procedure, eligibility, benefit_amount",
  "status": "one of: VERIFIED (you are confident it is correct), SUSPICIOUS (may be incorrect), LIKELY_FALSE (probably wrong), UNCERTAIN (cannot determine)",
  "confidence": 0.0-1.0,
  "reasoning": "Why you flagged or verified this claim",
  "suggestion": "If flagged, what should be corrected or verified"
}

Focus especially on:
1. CFR references that may cite wrong section numbers
2. Statistics or percentages that seem fabricated
3. VA policy claims that may be outdated or wrong
4. Date claims that don't make sense
5. Contradictions within the article
6. Claims presented as fact that are actually disputed or opinion

Return ONLY the JSON array, no other text.`;

  const userPrompt = `Article title: "${title}"

Article body:
${truncated}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Parse the JSON response - handle markdown code blocks
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const claims = JSON.parse(cleaned);
    return {
      status: 'COMPLETED',
      model: OPENAI_MODEL,
      claims: Array.isArray(claims) ? claims : [],
    };
  } catch (err) {
    process.stderr.write(`[claim-validator] AI analysis error: ${err.message}\n`);
    return {
      status: 'ERROR',
      message: err.message,
      claims: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function loadArticle(args) {
  if (args.includes('--stdin')) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  }

  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    throw new Error('Usage: claim-validator.mjs <path-to-article.json> or --stdin');
  }
  const resolved = resolve(filePath);
  const raw = await readFile(resolved, 'utf-8');
  return JSON.parse(raw);
}

async function run() {
  const args = process.argv.slice(2);

  try {
    process.stderr.write('[claim-validator] Loading article...\n');
    const article = await loadArticle(args);

    if (!article.body && !article.content) {
      throw new Error('Article must have a "body" or "content" field.');
    }

    const text = article.body || article.content;
    const title = article.title || article.headline || '(untitled)';

    process.stderr.write(`[claim-validator] Analyzing claims in: "${title}"\n`);

    // Local pre-checks
    process.stderr.write('[claim-validator] Extracting statistics...\n');
    const statistics = extractStatistics(text);

    process.stderr.write('[claim-validator] Checking date claims...\n');
    const dateClaims = extractDateClaims(text);
    const dateIssues = dateClaims.filter(d => d.issue !== null);

    process.stderr.write('[claim-validator] Finding unsupported assertions...\n');
    const unsupportedClaims = extractUnsupportedClaims(text);

    // AI-powered analysis
    process.stderr.write('[claim-validator] Running AI claim analysis...\n');
    const aiAnalysis = await analyzeClaimsWithAI(article);

    // Compile results
    const aiClaims = aiAnalysis.claims || [];
    const suspiciousClaims = aiClaims.filter(c =>
      ['SUSPICIOUS', 'LIKELY_FALSE'].includes(c.status)
    );
    const verifiedClaims = aiClaims.filter(c => c.status === 'VERIFIED');
    const uncertainClaims = aiClaims.filter(c => c.status === 'UNCERTAIN');

    const likelyFalseClaims = aiClaims.filter(c => c.status === 'LIKELY_FALSE');
    const highConfidenceLikelyFalse = likelyFalseClaims.filter(c => Number(c.confidence || 0) >= 0.85);
    const unsupportedHighRisk = unsupportedClaims.filter(c => !c.hasCitationNearby);
    const triageSignals = {
      aiLikelyFalse: likelyFalseClaims.length,
      aiSuspicious: suspiciousClaims.filter(c => c.status === 'SUSPICIOUS').length,
      highConfidenceLikelyFalse: highConfidenceLikelyFalse.length,
      deterministicDateIssues: dateIssues.length,
      unsupportedWithoutNearbyCitation: unsupportedHighRisk.length,
    };

    // Determine severity
    const hasLikelyFalse = aiClaims.some(c => c.status === 'LIKELY_FALSE');
    const hasSuspicious = suspiciousClaims.length > 0;
    const hasDateIssues = dateIssues.length > 0;

    let overallStatus = 'PASS';
    if (dateIssues.some(d => d.issue === 'FUTURE_DATE_AS_FACT')) {
      overallStatus = 'BLOCK';
    } else if (hasLikelyFalse || hasSuspicious || hasDateIssues || unsupportedHighRisk.length > 3) {
      overallStatus = 'NEEDS_REVIEW';
    }

    const report = {
      agent: 'claim-validator',
      timestamp: new Date().toISOString(),
      article: { title, id: article.id || null },
      summary: {
        totalClaimsAnalyzed: aiClaims.length,
        verified: verifiedClaims.length,
        suspicious: suspiciousClaims.length,
        likelyFalse: aiClaims.filter(c => c.status === 'LIKELY_FALSE').length,
        uncertain: uncertainClaims.length,
        statisticsFound: statistics.length,
        dateIssues: dateIssues.length,
        unsupportedAssertions: unsupportedClaims.length,
        unsupportedWithoutNearbyCitation: unsupportedHighRisk.length,
        triageSignals,
      },
      overallStatus,
      methodology: {
        mode: 'editorial-triage',
        note: 'LLM claim analysis is advisory and should drive review priorities, not substitute for source verification.',
      },
      aiAnalysis: {
        status: aiAnalysis.status,
        model: aiAnalysis.model || null,
        claims: aiClaims,
      },
      localChecks: {
        statistics: statistics.map(s => ({
          statistic: s.statistic,
          context: s.context,
          note: 'Verify this statistic against authoritative sources.',
        })),
        dateIssues: dateIssues.map(d => ({
          date: d.dateRef,
          context: d.context,
          issue: d.issue,
          severity: d.issue === 'FUTURE_DATE_AS_FACT' ? 'BLOCK' : 'WARNING',
        })),
        unsupportedClaims: unsupportedClaims.map(c => ({
          claim: c.claim,
          hasCitationNearby: c.hasCitationNearby,
          severity: c.hasCitationNearby ? 'INFO' : 'WARNING',
        })),
      },
    };

    process.stderr.write(
      `[claim-validator] Complete: ${verifiedClaims.length} verified, ` +
      `${suspiciousClaims.length} suspicious, ${aiClaims.filter(c => c.status === 'LIKELY_FALSE').length} likely false. ` +
      `Status: ${overallStatus}\n`
    );

    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (err) {
    const errorReport = {
      agent: 'claim-validator',
      timestamp: new Date().toISOString(),
      error: err.message,
      overallStatus: 'ERROR',
    };
    process.stderr.write(`[claim-validator] ERROR: ${err.message}\n`);
    process.stdout.write(JSON.stringify(errorReport, null, 2) + '\n');
    process.exit(1);
  }
}

run();
