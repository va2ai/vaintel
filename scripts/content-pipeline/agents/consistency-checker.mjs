#!/usr/bin/env node

/**
 * consistency-checker.mjs
 *
 * QA agent that checks a draft article for internal consistency:
 * headline-body alignment, contradictions, tone, formatting, dates,
 * and link/reference consistency.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/consistency-checker.mjs <path-to-article.json>
 *   echo '{"body":"..."}' | node scripts/content-pipeline/agents/consistency-checker.mjs --stdin
 *
 * Output: JSON consistency report to stdout
 * Status: logged to stderr
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Headline-Body consistency
// ---------------------------------------------------------------------------

function checkHeadlineBodyConsistency(title, body) {
  const issues = [];

  if (!title || title.trim().length === 0) {
    issues.push({
      check: 'headline_present',
      status: 'FAIL',
      severity: 'WARNING',
      message: 'Article has no title/headline.',
    });
    return issues;
  }

  // Extract key terms from headline
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
    'these', 'those', 'it', 'its', 'how', 'what', 'why', 'when', 'where',
    'who', 'which', 'your', 'you', 'our', 'we', 'they', 'them', 'their',
    'about', 'after', 'before', 'between', 'into', 'through', 'during',
    'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just',
  ]);

  const titleWords = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  if (titleWords.length === 0) {
    issues.push({
      check: 'headline_meaningful',
      status: 'FAIL',
      severity: 'WARNING',
      message: 'Headline contains no meaningful keywords.',
    });
    return issues;
  }

  const bodyLower = body.toLowerCase();
  const matchedWords = titleWords.filter(w => bodyLower.includes(w));
  const matchRatio = matchedWords.length / titleWords.length;

  if (matchRatio < 0.3) {
    issues.push({
      check: 'headline_body_alignment',
      status: 'FAIL',
      severity: 'WARNING',
      message: `Only ${Math.round(matchRatio * 100)}% of headline keywords appear in the body. The body may not deliver on the headline's promise.`,
      details: {
        headlineKeywords: titleWords,
        matchedInBody: matchedWords,
        missingFromBody: titleWords.filter(w => !bodyLower.includes(w)),
      },
    });
  } else if (matchRatio < 0.6) {
    issues.push({
      check: 'headline_body_alignment',
      status: 'WARNING',
      severity: 'INFO',
      message: `${Math.round(matchRatio * 100)}% of headline keywords appear in the body. Some key topics may not be adequately covered.`,
      details: {
        missingFromBody: titleWords.filter(w => !bodyLower.includes(w)),
      },
    });
  } else {
    issues.push({
      check: 'headline_body_alignment',
      status: 'PASS',
      severity: 'OK',
      message: 'Headline keywords are well-represented in the body.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Internal contradictions
// ---------------------------------------------------------------------------

function checkForContradictions(text) {
  const issues = [];

  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 15);

  // Look for negation pairs: "X is required" vs "X is not required"
  const assertionPairs = [];
  const assertionPattern = /\b((?:is|are|was|were)\s+(?:not\s+)?(?:required|mandatory|optional|prohibited|allowed|necessary|needed|eligible|exempt|excluded|included))\b/gi;

  for (const sentence of sentences) {
    let match;
    const regex = new RegExp(assertionPattern.source, assertionPattern.flags);
    while ((match = regex.exec(sentence)) !== null) {
      assertionPairs.push({
        assertion: match[1].toLowerCase(),
        sentence: sentence.trim().slice(0, 150),
        hasNegation: /\bnot\b/i.test(match[1]),
      });
    }
  }

  // Check for contradicting pairs within the same article
  for (let i = 0; i < assertionPairs.length; i++) {
    for (let j = i + 1; j < assertionPairs.length; j++) {
      const a = assertionPairs[i];
      const b = assertionPairs[j];

      // Same root assertion but different negation
      const aBase = a.assertion.replace(/\bnot\s+/i, '');
      const bBase = b.assertion.replace(/\bnot\s+/i, '');

      if (aBase === bBase && a.hasNegation !== b.hasNegation) {
        issues.push({
          check: 'internal_contradiction',
          status: 'FAIL',
          severity: 'WARNING',
          message: 'Potential contradiction detected between statements.',
          details: {
            statement1: a.sentence,
            statement2: b.sentence,
          },
        });
      }
    }
  }

  // Check for contradicting absolutes
  const absolutePairs = [
    { pos: /\balways\b/gi, neg: /\bnever\b/gi },
    { pos: /\ball\s+veterans\b/gi, neg: /\bno\s+veterans?\b/gi },
    { pos: /\beveryone\b/gi, neg: /\bno\s+one\b/gi },
  ];

  for (const pair of absolutePairs) {
    const posMatches = text.match(pair.pos);
    const negMatches = text.match(pair.neg);

    if (posMatches && negMatches) {
      issues.push({
        check: 'contradicting_absolutes',
        status: 'WARNING',
        severity: 'INFO',
        message: 'Article uses both absolute positive and negative language. Verify these are not contradictory.',
        details: {
          positiveTerms: posMatches,
          negativeTerms: negMatches,
        },
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      check: 'internal_consistency',
      status: 'PASS',
      severity: 'OK',
      message: 'No obvious contradictions detected.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Tone consistency
// ---------------------------------------------------------------------------

function checkToneConsistency(text) {
  const issues = [];

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);

  if (paragraphs.length < 2) {
    issues.push({
      check: 'tone_consistency',
      status: 'PASS',
      severity: 'OK',
      message: 'Article is too short for tone variation analysis.',
    });
    return issues;
  }

  // Check for informal language mixed with formal
  const informalPatterns = [
    /\b(gonna|wanna|gotta|kinda|sorta|ain't|y'all)\b/gi,
    /\blol\b/gi,
    /\bomg\b/gi,
    /!{3,}/g,
    /\?\?+/g,
    /\b(dude|bro|man|buddy)\b/gi,
    /\b(awesome|cool|sick|lit|fire)\b/gi,
  ];

  const formalPatterns = [
    /\b(pursuant\s+to|notwithstanding|hereinafter|aforementioned|wherein|heretofore)\b/gi,
    /\b(the\s+undersigned|party\s+of\s+the\s+first\s+part)\b/gi,
  ];

  let informalCount = 0;
  let formalCount = 0;
  const informalFindings = [];
  const formalFindings = [];

  for (const para of paragraphs) {
    for (const pattern of informalPatterns) {
      const matches = para.match(new RegExp(pattern.source, pattern.flags));
      if (matches) {
        informalCount += matches.length;
        informalFindings.push(...matches.map(m => m.toLowerCase()));
      }
    }
    for (const pattern of formalPatterns) {
      const matches = para.match(new RegExp(pattern.source, pattern.flags));
      if (matches) {
        formalCount += matches.length;
        formalFindings.push(...matches.map(m => m.toLowerCase()));
      }
    }
  }

  if (informalCount > 0) {
    issues.push({
      check: 'informal_language',
      status: 'FAIL',
      severity: 'WARNING',
      message: `Found ${informalCount} instance(s) of informal language. The site should maintain a professional, veteran-friendly tone.`,
      details: { examples: [...new Set(informalFindings)].slice(0, 10) },
    });
  }

  if (formalCount > 0 && formalCount > 2) {
    issues.push({
      check: 'overly_formal_language',
      status: 'WARNING',
      severity: 'INFO',
      message: `Found ${formalCount} instance(s) of overly formal/legal jargon. Content should be accessible to veterans.`,
      details: { examples: [...new Set(formalFindings)].slice(0, 10) },
    });
  }

  // Check for person consistency (first person vs second person vs third person)
  let firstPerson = 0;
  let secondPerson = 0;
  let thirdPerson = 0;

  for (const para of paragraphs) {
    if (/\b(I|me|my|mine|we|us|our|ours)\b/g.test(para)) firstPerson++;
    if (/\b(you|your|yours|yourself)\b/g.test(para)) secondPerson++;
    if (/\b(he|she|they|them|their|the\s+veteran|veterans|claimants?)\b/gi.test(para)) thirdPerson++;
  }

  const personModes = [
    { label: 'first person', count: firstPerson },
    { label: 'second person', count: secondPerson },
    { label: 'third person', count: thirdPerson },
  ].filter(m => m.count > 0);

  if (personModes.length >= 3 && firstPerson > 2) {
    issues.push({
      check: 'person_consistency',
      status: 'WARNING',
      severity: 'INFO',
      message: 'Article mixes first, second, and third person extensively. Consider standardizing voice.',
      details: {
        firstPersonParagraphs: firstPerson,
        secondPersonParagraphs: secondPerson,
        thirdPersonParagraphs: thirdPerson,
      },
    });
  }

  if (issues.length === 0) {
    issues.push({
      check: 'tone_consistency',
      status: 'PASS',
      severity: 'OK',
      message: 'Tone appears consistent throughout the article.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Formatting consistency
// ---------------------------------------------------------------------------

function checkFormattingConsistency(text) {
  const issues = [];

  // Check heading hierarchy (markdown headings)
  const headings = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(text)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2],
      position: match.index,
    });
  }

  if (headings.length > 0) {
    // Check for skipped heading levels (e.g., h1 -> h3 without h2)
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1].level;
      const curr = headings[i].level;
      if (curr > prev + 1) {
        issues.push({
          check: 'heading_hierarchy',
          status: 'FAIL',
          severity: 'WARNING',
          message: `Heading level skipped: went from h${prev} to h${curr} without intermediate level.`,
          details: {
            previousHeading: `h${prev}: ${headings[i - 1].text}`,
            currentHeading: `h${curr}: ${headings[i].text}`,
          },
        });
      }
    }

    // Check for multiple h1s
    const h1s = headings.filter(h => h.level === 1);
    if (h1s.length > 1) {
      issues.push({
        check: 'multiple_h1',
        status: 'WARNING',
        severity: 'INFO',
        message: `Article has ${h1s.length} h1 headings. Typically only one h1 is recommended.`,
        details: { h1Headings: h1s.map(h => h.text) },
      });
    }
  }

  // Check for consistent list formatting
  const bulletLines = text.match(/^\s*[-*+]\s/gm) || [];
  const numberedLines = text.match(/^\s*\d+[.)]\s/gm) || [];
  const mixedBullets = new Set(bulletLines.map(b => b.trim()[0]));

  if (mixedBullets.size > 1) {
    issues.push({
      check: 'list_style_consistency',
      status: 'WARNING',
      severity: 'INFO',
      message: `Mixed bullet styles detected (${[...mixedBullets].join(', ')}). Consider using consistent bullet characters.`,
    });
  }

  // Check for very short or very long paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0 && !p.trim().startsWith('#'));
  const lengths = paragraphs.map(p => p.trim().length);

  if (lengths.length > 3) {
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const veryLong = lengths.filter(l => l > avg * 3);
    const veryShort = lengths.filter(l => l < 20 && l > 0);

    if (veryLong.length > 0) {
      issues.push({
        check: 'paragraph_length',
        status: 'WARNING',
        severity: 'INFO',
        message: `${veryLong.length} paragraph(s) are significantly longer than average. Consider breaking them up for readability.`,
      });
    }
  }

  // Check for broken markdown
  const unclosedBold = (text.match(/\*\*/g) || []).length % 2 !== 0;
  const unclosedItalic = (text.match(/(?<!\*)\*(?!\*)/g) || []).length % 2 !== 0;
  const unclosedLinks = (text.match(/\[/g) || []).length !== (text.match(/\]/g) || []).length;

  if (unclosedBold) {
    issues.push({
      check: 'markdown_bold',
      status: 'FAIL',
      severity: 'WARNING',
      message: 'Unclosed bold markdown (**) detected.',
    });
  }
  if (unclosedItalic) {
    issues.push({
      check: 'markdown_italic',
      status: 'WARNING',
      severity: 'INFO',
      message: 'Possible unclosed italic markdown (*) detected.',
    });
  }
  if (unclosedLinks) {
    issues.push({
      check: 'markdown_links',
      status: 'FAIL',
      severity: 'WARNING',
      message: 'Mismatched square brackets detected. Check markdown links.',
    });
  }

  if (issues.length === 0) {
    issues.push({
      check: 'formatting_consistency',
      status: 'PASS',
      severity: 'OK',
      message: 'Formatting appears consistent.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Date consistency
// ---------------------------------------------------------------------------

function checkDateConsistency(text) {
  const issues = [];
  const currentYear = new Date().getFullYear();

  // Extract all years
  const yearPattern = /\b(19\d{2}|20\d{2})\b/g;
  const years = [];
  let match;
  while ((match = yearPattern.exec(text)) !== null) {
    const year = parseInt(match[1], 10);
    const start = Math.max(0, match.index - 60);
    const end = Math.min(text.length, match.index + match[0].length + 60);
    const context = text.slice(start, end).replace(/\n/g, ' ').trim();
    years.push({ year, context, position: match.index });
  }

  // Check for future years used as past facts
  const futureYears = years.filter(y => y.year > currentYear);
  for (const fy of futureYears) {
    // Check if context suggests this is a past event
    const pastIndicators = /\b(was|were|happened|occurred|passed|enacted|signed|established|created|decided)\b/i;
    if (pastIndicators.test(fy.context)) {
      issues.push({
        check: 'future_date_as_past',
        status: 'FAIL',
        severity: 'WARNING',
        message: `Year ${fy.year} is in the future but appears to describe a past event.`,
        details: { context: fy.context },
      });
    }
  }

  // Check for chronological consistency
  // Find sequences where dates appear to tell a story
  const dateSequences = years.filter(y => y.year >= 1900 && y.year <= currentYear + 5);
  for (let i = 1; i < dateSequences.length; i++) {
    const prev = dateSequences[i - 1];
    const curr = dateSequences[i];

    // If context suggests a sequence but dates go backward
    const sequenceWords = /\b(then|later|subsequently|afterward|next|following|since\s+then)\b/i;
    if (sequenceWords.test(curr.context) && curr.year < prev.year - 5) {
      issues.push({
        check: 'chronological_order',
        status: 'WARNING',
        severity: 'INFO',
        message: `Possible chronological inconsistency: narrative suggests progression but dates go from ${prev.year} to ${curr.year}.`,
        details: {
          earlier: { year: prev.year, context: prev.context },
          later: { year: curr.year, context: curr.context },
        },
      });
    }
  }

  if (issues.length === 0) {
    issues.push({
      check: 'date_consistency',
      status: 'PASS',
      severity: 'OK',
      message: years.length > 0
        ? `${years.length} date references found, no consistency issues detected.`
        : 'No date references found in article.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Link / reference consistency
// ---------------------------------------------------------------------------

function checkLinkConsistency(text) {
  const issues = [];

  // Extract markdown links
  const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
  const links = [];
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      position: match.index,
    });
  }

  // Check for empty link text
  const emptyText = links.filter(l => l.text.trim().length === 0);
  if (emptyText.length > 0) {
    issues.push({
      check: 'empty_link_text',
      status: 'FAIL',
      severity: 'WARNING',
      message: `${emptyText.length} link(s) have empty text.`,
      details: { urls: emptyText.map(l => l.url) },
    });
  }

  // Check for broken URL formats
  const brokenUrls = links.filter(l =>
    l.url.trim().length === 0 ||
    (l.url.startsWith('http') && !/^https?:\/\/[^\s]+$/.test(l.url))
  );
  if (brokenUrls.length > 0) {
    issues.push({
      check: 'broken_url_format',
      status: 'FAIL',
      severity: 'WARNING',
      message: `${brokenUrls.length} link(s) have malformed URLs.`,
      details: { links: brokenUrls.map(l => ({ text: l.text, url: l.url })) },
    });
  }

  // Check for duplicate links
  const urlCounts = {};
  for (const l of links) {
    urlCounts[l.url] = (urlCounts[l.url] || 0) + 1;
  }
  const duplicates = Object.entries(urlCounts).filter(([, count]) => count > 3);
  if (duplicates.length > 0) {
    issues.push({
      check: 'duplicate_links',
      status: 'WARNING',
      severity: 'INFO',
      message: `Some URLs are linked more than 3 times.`,
      details: { duplicates: duplicates.map(([url, count]) => ({ url, count })) },
    });
  }

  // Check for internal references that don't resolve
  const internalRefs = text.match(/\b(see\s+(?:above|below|section|the\s+\w+\s+section))\b/gi) || [];
  if (internalRefs.length > 0) {
    issues.push({
      check: 'internal_references',
      status: 'INFO',
      severity: 'INFO',
      message: `${internalRefs.length} internal reference(s) found (e.g., "see above"). Verify these point to actual content.`,
      details: { references: internalRefs },
    });
  }

  if (issues.length === 0) {
    issues.push({
      check: 'link_consistency',
      status: 'PASS',
      severity: 'OK',
      message: links.length > 0
        ? `${links.length} links found, no consistency issues detected.`
        : 'No links found in article.',
    });
  }

  return issues;
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
    throw new Error('Usage: consistency-checker.mjs <path-to-article.json> or --stdin');
  }
  const resolved = resolve(filePath);
  const raw = await readFile(resolved, 'utf-8');
  return JSON.parse(raw);
}

async function run() {
  const args = process.argv.slice(2);

  try {
    process.stderr.write('[consistency-checker] Loading article...\n');
    const article = await loadArticle(args);

    if (!article.body && !article.content) {
      throw new Error('Article must have a "body" or "content" field.');
    }

    const text = article.body || article.content;
    const title = article.title || article.headline || '(untitled)';

    process.stderr.write(`[consistency-checker] Analyzing: "${title}"\n`);

    // Run all checks
    process.stderr.write('[consistency-checker] Checking headline-body consistency...\n');
    const headlineChecks = checkHeadlineBodyConsistency(title, text);

    process.stderr.write('[consistency-checker] Checking for contradictions...\n');
    const contradictionChecks = checkForContradictions(text);

    process.stderr.write('[consistency-checker] Checking tone consistency...\n');
    const toneChecks = checkToneConsistency(text);

    process.stderr.write('[consistency-checker] Checking formatting consistency...\n');
    const formattingChecks = checkFormattingConsistency(text);

    process.stderr.write('[consistency-checker] Checking date consistency...\n');
    const dateChecks = checkDateConsistency(text);

    process.stderr.write('[consistency-checker] Checking link/reference consistency...\n');
    const linkChecks = checkLinkConsistency(text);

    // Aggregate
    const allChecks = [
      ...headlineChecks,
      ...contradictionChecks,
      ...toneChecks,
      ...formattingChecks,
      ...dateChecks,
      ...linkChecks,
    ];

    const passed = allChecks.filter(c => c.status === 'PASS').length;
    const warnings = allChecks.filter(c => ['FAIL', 'WARNING'].includes(c.status) && c.severity === 'WARNING').length;
    const info = allChecks.filter(c => c.severity === 'INFO').length;
    const blocks = allChecks.filter(c => c.severity === 'BLOCK').length;

    let overallStatus = 'PASS';
    if (blocks > 0) {
      overallStatus = 'BLOCK';
    } else if (warnings > 2) {
      overallStatus = 'NEEDS_REVIEW';
    } else if (warnings > 0) {
      overallStatus = 'PASS_WITH_WARNINGS';
    }

    const report = {
      agent: 'consistency-checker',
      timestamp: new Date().toISOString(),
      article: { title, id: article.id || null },
      summary: {
        totalChecks: allChecks.length,
        passed,
        warnings,
        info,
        blocks,
      },
      overallStatus,
      checks: {
        headlineBody: headlineChecks,
        contradictions: contradictionChecks,
        tone: toneChecks,
        formatting: formattingChecks,
        dates: dateChecks,
        links: linkChecks,
      },
    };

    process.stderr.write(
      `[consistency-checker] Complete: ${passed} passed, ${warnings} warnings, ${info} info. ` +
      `Status: ${overallStatus}\n`
    );

    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (err) {
    const errorReport = {
      agent: 'consistency-checker',
      timestamp: new Date().toISOString(),
      error: err.message,
      overallStatus: 'ERROR',
    };
    process.stderr.write(`[consistency-checker] ERROR: ${err.message}\n`);
    process.stdout.write(JSON.stringify(errorReport, null, 2) + '\n');
    process.exit(1);
  }
}

run();
