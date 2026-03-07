#!/usr/bin/env node

/**
 * legal-language-checker.mjs
 *
 * QA agent that scans a draft article for language that could constitute
 * legal advice, medical advice, outcome guarantees, unauthorized practice
 * of law, or PII exposure.
 *
 * This is the MOST CRITICAL checker. The site serves veterans and must
 * NEVER cross into unauthorized practice of law (UPL) or provide
 * medical advice.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/legal-language-checker.mjs <path-to-article.json>
 *   echo '{"body":"..."}' | node scripts/content-pipeline/agents/legal-language-checker.mjs --stdin
 *
 * Output: JSON legal compliance report to stdout
 * Status: logged to stderr
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PROHIBITED_LEGAL_PHRASES,
  PROHIBITED_MEDICAL_PHRASES,
  PROHIBITED_GUARANTEE_PHRASES,
  PII_PATTERNS,
} from '../lib/known-references.mjs';

// ---------------------------------------------------------------------------
// Additional prohibited patterns (beyond known-references.mjs)
// ---------------------------------------------------------------------------

const ADDITIONAL_LEGAL_PATTERNS = [
  // Directive language
  { pattern: /\byou\s+need\s+to\s+(file|submit|appeal|request)/gi, category: 'directive_language', severity: 'WARNING', suggestion: 'Use "veterans may consider" or "it may be beneficial to" instead of directive language.' },
  { pattern: /\byou\s+should\s+(always|never|immediately)/gi, category: 'directive_language', severity: 'WARNING', suggestion: 'Avoid directive absolutes. Use "veterans may want to consider" instead.' },
  { pattern: /\bdon'?t\s+(file|submit|appeal|wait)/gi, category: 'directive_language', severity: 'WARNING', suggestion: 'Avoid negative directives. Present options and let veterans decide.' },
  { pattern: /\bmake\s+sure\s+(you|to)\s+(file|submit|include|get)/gi, category: 'directive_language', severity: 'WARNING', suggestion: 'Use "it is generally recommended to" or "veterans often find it helpful to" instead.' },

  // Attorney-client implications
  { pattern: /\bour\s+(client|veteran|case)/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Never imply a professional relationship with the reader.' },
  { pattern: /\bwe\s+(filed|submitted|appealed|represented)/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Never imply acting on behalf of a veteran.' },
  { pattern: /\b(hire|retain|engage)\s+(us|me|our\s+team)/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Do not solicit clients.' },
  { pattern: /\bconsultation\s+(fee|cost|price|is\s+free)/gi, category: 'UPL', severity: 'WARNING', suggestion: 'Avoid language that implies offering professional consultations.' },

  // Specific outcome predictions
  { pattern: /\byou('ll|\s+will)\s+(likely|probably|definitely)\s+(get|receive|win|be\s+awarded)/gi, category: 'outcome_prediction', severity: 'BLOCK', suggestion: 'Never predict specific outcomes. Each case is unique.' },
  { pattern: /\bmost\s+(veterans|claimants|people)\s+(win|get\s+approved|succeed)\s+(when|if|with)/gi, category: 'outcome_prediction', severity: 'WARNING', suggestion: 'Avoid implying typical outcomes. Use "some veterans have reported" if sharing anecdotes.' },
  { pattern: /\b(easy|simple|quick)\s+(approval|win|grant|increase)/gi, category: 'outcome_prediction', severity: 'WARNING', suggestion: 'VA claims are complex. Avoid minimizing the process.' },
  { pattern: /\bopen\s+and\s+shut\s+case/gi, category: 'outcome_prediction', severity: 'WARNING', suggestion: 'No claim is an "open and shut case." Remove this phrase.' },

  // Unauthorized practice of law specifics
  { pattern: /\bwe\s+can\s+(help\s+you|get\s+you|win\s+your)/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Do not promise to help win claims unless you are an accredited representative.' },
  { pattern: /\blet\s+(us|me)\s+(handle|take\s+care\s+of|manage)\s+(your|the)\s+(claim|case|appeal)/gi, category: 'UPL', severity: 'BLOCK', suggestion: 'Never offer to handle claims. Only accredited representatives can do this.' },
  { pattern: /\b(accredited|certified|licensed)\s+(representative|attorney|agent)/gi, category: 'representation_claim', severity: 'WARNING', suggestion: 'If claiming accreditation, verify this is accurate and properly disclosed.' },

  // Financial advice territory
  { pattern: /\byou\s+should\s+(invest|save|spend)\s+(your|the)\s+(back\s+pay|retro|compensation)/gi, category: 'financial_advice', severity: 'WARNING', suggestion: 'Do not provide financial advice about VA compensation.' },
  { pattern: /\btax\s+(free|exempt|deductible|implications)/gi, category: 'financial_advice', severity: 'INFO', suggestion: 'Tax information should be clearly sourced. Recommend consulting a tax professional.' },
];

const ADDITIONAL_MEDICAL_PATTERNS = [
  // Diagnosis implications
  { pattern: /\byou\s+(likely|probably|definitely)\s+have\s+/gi, category: 'medical_diagnosis', severity: 'BLOCK', suggestion: 'Never suggest diagnoses. Only qualified medical professionals can diagnose.' },
  { pattern: /\bsymptoms\s+(mean|indicate|prove)\s+(you\s+have|that\s+you)/gi, category: 'medical_diagnosis', severity: 'BLOCK', suggestion: 'Symptoms do not prove a diagnosis. Suggest consulting a healthcare provider.' },
  { pattern: /\byour\s+(PTSD|TBI|depression|anxiety|disability)\s+(is|was)\s+(caused\s+by|due\s+to|a\s+result\s+of)/gi, category: 'medical_causation', severity: 'BLOCK', suggestion: 'Causation determinations require medical opinions. Do not state causation as fact.' },

  // Treatment recommendations
  { pattern: /\b(try|consider|use)\s+(CBD|cannabis|marijuana|kratom|supplements?)/gi, category: 'medical_advice', severity: 'BLOCK', suggestion: 'Never recommend specific substances or supplements.' },
  { pattern: /\bthis\s+(treatment|therapy|approach)\s+(works|is\s+effective|will\s+help)/gi, category: 'medical_advice', severity: 'WARNING', suggestion: 'Treatment effectiveness claims should cite medical studies and include disclaimers.' },
  { pattern: /\b(increase|decrease|change)\s+your\s+(dose|dosage|medication)/gi, category: 'medical_advice', severity: 'BLOCK', suggestion: 'Never advise changing medication. This is solely a medical decision.' },

  // Mental health specific
  { pattern: /\byou\s+(are|aren't)\s+(crazy|insane|mentally\s+ill)/gi, category: 'stigmatizing_language', severity: 'BLOCK', suggestion: 'Remove stigmatizing mental health language.' },
  { pattern: /\bjust\s+(get\s+over|snap\s+out\s+of|push\s+through)\s+(it|your)/gi, category: 'harmful_advice', severity: 'BLOCK', suggestion: 'This language is harmful to veterans with mental health conditions. Remove immediately.' },
];

const DISCLAIMERS_CHECK = [
  { pattern: /\bnot\s+(legal|medical)\s+advice\b/gi, isDisclaimer: true },
  { pattern: /\bconsult\s+(a|an|your)\s+(attorney|lawyer|doctor|physician|healthcare)/gi, isDisclaimer: true },
  { pattern: /\bfor\s+(informational|educational)\s+purposes\s+only\b/gi, isDisclaimer: true },
  { pattern: /\bthis\s+(article|guide|information)\s+(does|is)\s+not\s+(constitute|replace)/gi, isDisclaimer: true },
];

// ---------------------------------------------------------------------------
// Scanning engine
// ---------------------------------------------------------------------------

function scanForProhibitedLanguage(text) {
  const allPatterns = [
    ...PROHIBITED_LEGAL_PHRASES,
    ...PROHIBITED_MEDICAL_PHRASES,
    ...PROHIBITED_GUARANTEE_PHRASES,
    ...PII_PATTERNS,
    ...ADDITIONAL_LEGAL_PATTERNS,
    ...ADDITIONAL_MEDICAL_PATTERNS,
  ];

  const findings = [];

  for (const rule of allPatterns) {
    // Reset regex lastIndex
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      const context = text.slice(start, end).replace(/\n/g, ' ').trim();

      findings.push({
        matchedText: match[0],
        context,
        category: rule.category,
        severity: rule.severity,
        suggestion: rule.suggestion,
        position: match.index,
      });
    }
  }

  // Deduplicate by position (some patterns may overlap)
  const seen = new Set();
  const deduped = findings.filter(f => {
    const key = `${f.position}-${f.matchedText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => {
    const severityOrder = { BLOCK: 0, WARNING: 1, INFO: 2 };
    const sa = severityOrder[a.severity] ?? 3;
    const sb = severityOrder[b.severity] ?? 3;
    return sa - sb || a.position - b.position;
  });
}

function checkForDisclaimers(text) {
  const found = [];
  for (const check of DISCLAIMERS_CHECK) {
    const regex = new RegExp(check.pattern.source, check.pattern.flags);
    const match = regex.exec(text);
    if (match) {
      found.push(match[0]);
    }
  }
  return found;
}

/**
 * Perform contextual analysis - check if flagged phrases are used in
 * educational/informational context vs directive context.
 */
function analyzeContext(findings, fullText) {
  return findings.map(finding => {
    // Check if the flagged text is within a quote, example, or "don't do this" context
    const surrounding = fullText.slice(
      Math.max(0, finding.position - 150),
      Math.min(fullText.length, finding.position + finding.matchedText.length + 150)
    );

    const inQuote = /[""].*?[""]/.test(surrounding) &&
      surrounding.indexOf(finding.matchedText) > surrounding.indexOf('"');
    const inExample = /\b(example|for\s+instance|such\s+as|e\.g\.)\b/i.test(surrounding);
    const inNegation = /\b(never|don't|do\s+not|should\s+not|avoid|instead\s+of)\b/i.test(
      surrounding.slice(0, surrounding.indexOf(finding.matchedText))
    );

    let contextNote = null;
    let adjustedSeverity = finding.severity;

    if (inNegation) {
      contextNote = 'This phrase appears in a negation context (telling what NOT to do). May be acceptable.';
      if (finding.severity === 'WARNING') adjustedSeverity = 'INFO';
    } else if (inExample) {
      contextNote = 'This phrase appears in an example context. May be acceptable if clearly marked.';
      if (finding.severity === 'WARNING') adjustedSeverity = 'INFO';
    } else if (inQuote) {
      contextNote = 'This phrase appears within quotation marks. May be a quote rather than site language.';
    }

    return {
      ...finding,
      contextNote,
      adjustedSeverity,
    };
  });
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
    throw new Error('Usage: legal-language-checker.mjs <path-to-article.json> or --stdin');
  }
  const resolved = resolve(filePath);
  const raw = await readFile(resolved, 'utf-8');
  return JSON.parse(raw);
}

async function run() {
  const args = process.argv.slice(2);

  try {
    process.stderr.write('[legal-language-checker] Loading article...\n');
    const article = await loadArticle(args);

    if (!article.body && !article.content) {
      throw new Error('Article must have a "body" or "content" field.');
    }

    const text = article.body || article.content;
    const title = article.title || article.headline || '(untitled)';

    process.stderr.write(`[legal-language-checker] Scanning: "${title}"\n`);

    // Scan for prohibited language
    process.stderr.write('[legal-language-checker] Checking for prohibited language...\n');
    const rawFindings = scanForProhibitedLanguage(text);

    // Contextual analysis
    process.stderr.write('[legal-language-checker] Performing contextual analysis...\n');
    const findings = analyzeContext(rawFindings, text);

    // Check for disclaimers
    process.stderr.write('[legal-language-checker] Checking for disclaimers...\n');
    const disclaimers = checkForDisclaimers(text);

    // Categorize findings
    const blockLevel = findings.filter(f => f.adjustedSeverity === 'BLOCK');
    const warningLevel = findings.filter(f => f.adjustedSeverity === 'WARNING');
    const infoLevel = findings.filter(f => f.adjustedSeverity === 'INFO');

    const byCategory = {};
    for (const f of findings) {
      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f);
    }

    // Determine overall status
    let overallStatus = 'PASS';
    if (blockLevel.length > 0) {
      overallStatus = 'BLOCK';
    } else if (warningLevel.length > 0) {
      overallStatus = 'NEEDS_REVIEW';
    }

    // Check if disclaimers are present when needed
    const needsDisclaimer = findings.length > 0 && disclaimers.length === 0;

    const report = {
      agent: 'legal-language-checker',
      timestamp: new Date().toISOString(),
      article: { title, id: article.id || null },
      summary: {
        totalFindings: findings.length,
        blockLevel: blockLevel.length,
        warningLevel: warningLevel.length,
        infoLevel: infoLevel.length,
        categoryCounts: Object.fromEntries(
          Object.entries(byCategory).map(([k, v]) => [k, v.length])
        ),
        disclaimersFound: disclaimers.length,
        disclaimersMissing: needsDisclaimer,
      },
      overallStatus,
      disclaimers: {
        found: disclaimers,
        adequate: disclaimers.length >= 2,
        recommendation: needsDisclaimer
          ? 'Article contains flagged language but has no disclaimers. Add a disclaimer stating: "This article is for informational purposes only and does not constitute legal or medical advice. Consult with an accredited veterans service organization, attorney, or healthcare provider for guidance specific to your situation."'
          : disclaimers.length < 2
            ? 'Consider adding additional disclaimers for comprehensive coverage.'
            : 'Adequate disclaimers present.',
      },
      findings: findings.map(f => ({
        matchedText: f.matchedText,
        context: f.context,
        category: f.category,
        originalSeverity: f.severity,
        adjustedSeverity: f.adjustedSeverity,
        suggestion: f.suggestion,
        contextNote: f.contextNote,
      })),
      blockLevelIssues: blockLevel.map(f => ({
        matchedText: f.matchedText,
        context: f.context,
        category: f.category,
        suggestion: f.suggestion,
        reason: 'This language MUST be removed or rewritten before publication.',
      })),
    };

    process.stderr.write(
      `[legal-language-checker] Complete: ${blockLevel.length} BLOCK, ` +
      `${warningLevel.length} WARNING, ${infoLevel.length} INFO. ` +
      `Status: ${overallStatus}\n`
    );

    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (err) {
    const errorReport = {
      agent: 'legal-language-checker',
      timestamp: new Date().toISOString(),
      error: err.message,
      overallStatus: 'ERROR',
    };
    process.stderr.write(`[legal-language-checker] ERROR: ${err.message}\n`);
    process.stdout.write(JSON.stringify(errorReport, null, 2) + '\n');
    process.exit(1);
  }
}

run();
