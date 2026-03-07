#!/usr/bin/env node

/**
 * quality-scorer.mjs
 *
 * Final QA agent that takes a draft article AND all QA reports from other
 * agents, calculates an overall quality score (0-100), and produces a
 * publish-readiness assessment.
 *
 * Scoring breakdown:
 *   - Citation accuracy:     25 points (from citation-checker)
 *   - Factual reliability:   25 points (from claim-validator)
 *   - Legal compliance:      25 points (from legal-language-checker)
 *   - Consistency:           15 points (from consistency-checker)
 *   - Formatting/structure:  10 points (standalone checks)
 *
 * Publish readiness:
 *   - READY:          score >= 85, no BLOCK issues
 *   - NEEDS_REVISION: score 60-84 or WARNING issues
 *   - BLOCK:          score < 60 or any BLOCK issues
 *
 * Usage:
 *   node scripts/content-pipeline/agents/quality-scorer.mjs <article.json> \
 *     --citation-report <citation.json> \
 *     --claim-report <claim.json> \
 *     --legal-report <legal.json> \
 *     --consistency-report <consistency.json>
 *
 *   echo '{"article":{...},"reports":{...}}' | node quality-scorer.mjs --stdin
 *
 * Output: JSON quality scorecard to stdout, also saved to output/qa-reports/
 * Status: logged to stderr
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const QA_REPORTS_DIR = resolve(__dirname, '..', 'output', 'qa-reports');

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

/**
 * Score citation accuracy (0-25 points)
 */
function scoreCitations(report) {
  if (!report || report.overallStatus === 'ERROR') {
    return { score: 0, maxScore: 25, status: 'ERROR', details: 'Citation report not available or errored.' };
  }

  const { summary } = report;
  if (!summary) {
    return { score: 0, maxScore: 25, status: 'ERROR', details: 'Citation report has no summary.' };
  }

  const total = summary.totalCitations || 0;

  if (total === 0) {
    // No citations - could be fine for opinion pieces, but flag it
    return {
      score: 15,
      maxScore: 25,
      status: 'WARNING',
      details: 'No citations found. Articles with factual claims should include citations.',
      deductions: [{ reason: 'No citations present', points: -10 }],
    };
  }

  let score = 25;
  const deductions = [];

  // Block-level citation issues
  if (summary.blockLevelIssues > 0) {
    score -= 25; // Automatic zero
    deductions.push({
      reason: `${summary.blockLevelIssues} block-level citation issue(s)`,
      points: -25,
      isBlock: true,
    });
    return { score: 0, maxScore: 25, status: 'BLOCK', details: 'Block-level citation issues found.', deductions };
  }

  // Flagged citations
  const flaggedRatio = summary.flagged / total;
  if (flaggedRatio > 0.5) {
    const deduction = Math.min(20, Math.round(flaggedRatio * 25));
    score -= deduction;
    deductions.push({ reason: `${summary.flagged}/${total} citations flagged (${Math.round(flaggedRatio * 100)}%)`, points: -deduction });
  } else if (flaggedRatio > 0.2) {
    const deduction = Math.min(10, Math.round(flaggedRatio * 15));
    score -= deduction;
    deductions.push({ reason: `${summary.flagged}/${total} citations flagged`, points: -deduction });
  } else if (summary.flagged > 0) {
    score -= 3;
    deductions.push({ reason: `${summary.flagged} citation(s) flagged`, points: -3 });
  }

  // Unverified citations (minor deduction)
  if (summary.unverified > 0) {
    const deduction = Math.min(5, summary.unverified);
    score -= deduction;
    deductions.push({ reason: `${summary.unverified} unverified citation(s)`, points: -deduction });
  }

  return {
    score: Math.max(0, score),
    maxScore: 25,
    status: score >= 20 ? 'GOOD' : score >= 12 ? 'WARNING' : 'POOR',
    details: `${summary.verified}/${total} verified, ${summary.flagged} flagged, ${summary.unverified} unverified`,
    deductions,
  };
}

/**
 * Score factual reliability (0-25 points)
 */
function scoreClaims(report) {
  if (!report || report.overallStatus === 'ERROR') {
    return { score: 0, maxScore: 25, status: 'ERROR', details: 'Claim validator report not available or errored.' };
  }

  const { summary, aiAnalysis } = report;
  if (!summary) {
    return { score: 0, maxScore: 25, status: 'ERROR', details: 'Claim validator report has no summary.' };
  }

  let score = 25;
  const deductions = [];

  const triageSignals = summary.triageSignals || {};
  const corroboratingSignals = (summary.dateIssues || 0) + (summary.unsupportedWithoutNearbyCitation || 0);

  // AI analysis results are editorial triage, not hard verification.
  if (aiAnalysis?.status === 'SKIPPED') {
    score -= 2;
    deductions.push({ reason: 'AI editorial triage was skipped (no API key)', points: -2 });
  } else if (aiAnalysis?.status === 'COMPLETED') {
    const likelyFalse = summary.likelyFalse || 0;
    const suspicious = summary.suspicious || 0;

    if (likelyFalse > 0) {
      const basePenalty = Math.min(12, likelyFalse * 4);
      const corroborationPenalty = Math.min(8, corroboratingSignals * 2);
      const confidencePenalty = Math.min(4, (triageSignals.highConfidenceLikelyFalse || 0) * 2);
      const deduction = basePenalty + corroborationPenalty + confidencePenalty;
      score -= deduction;
      deductions.push({
        reason: `${likelyFalse} claim(s) flagged by AI triage as likely false; manual source review required`,
        points: -deduction,
      });
    }

    if (suspicious > 3) {
      const deduction = Math.min(8, suspicious * 2);
      score -= deduction;
      deductions.push({ reason: `${suspicious} suspicious claim(s) flagged for editorial review`, points: -deduction });
    } else if (suspicious > 0) {
      const deduction = suspicious;
      score -= deduction;
      deductions.push({ reason: `${suspicious} suspicious claim(s) flagged for editorial review`, points: -deduction });
    }
  }

  // Date issues
  if (summary.dateIssues > 0) {
    score -= Math.min(8, summary.dateIssues * 4);
    deductions.push({ reason: `${summary.dateIssues} date issue(s)`, points: -Math.min(8, summary.dateIssues * 4) });
  }

  // Unsupported claims without nearby citations
  const unsupported = summary.unsupportedWithoutNearbyCitation || 0;
  if (unsupported > 5) {
    score -= Math.min(10, unsupported);
    deductions.push({ reason: `${unsupported} unsupported assertions without nearby citations`, points: -Math.min(10, unsupported) });
  } else if (unsupported > 2) {
    score -= unsupported;
    deductions.push({ reason: `${unsupported} unsupported assertion(s)`, points: -unsupported });
  }

  return {
    score: Math.max(0, score),
    maxScore: 25,
    status: score >= 20 ? 'GOOD' : score >= 12 ? 'WARNING' : 'POOR',
    details: `${summary.totalClaimsAnalyzed} claims triaged, ${summary.suspicious || 0} suspicious, ${summary.likelyFalse || 0} likely-false flags`,
    deductions,
  };
}

/**
 * Score legal compliance (0-25 points)
 */
function scoreLegalCompliance(report) {
  if (!report || report.overallStatus === 'ERROR') {
    return { score: 0, maxScore: 25, status: 'ERROR', details: 'Legal language report not available or errored.' };
  }

  const { summary } = report;
  if (!summary) {
    return { score: 0, maxScore: 25, status: 'ERROR', details: 'Legal language report has no summary.' };
  }

  let score = 25;
  const deductions = [];

  // Block-level issues - automatic zero and BLOCK status
  if (summary.blockLevel > 0) {
    score = 0;
    deductions.push({
      reason: `${summary.blockLevel} block-level legal/medical compliance issue(s)`,
      points: -25,
      isBlock: true,
    });
    return { score: 0, maxScore: 25, status: 'BLOCK', details: 'Block-level legal compliance issues.', deductions };
  }

  // Warning-level issues
  if (summary.warningLevel > 5) {
    score -= Math.min(15, summary.warningLevel * 2);
    deductions.push({ reason: `${summary.warningLevel} warning-level issue(s)`, points: -Math.min(15, summary.warningLevel * 2) });
  } else if (summary.warningLevel > 0) {
    score -= summary.warningLevel * 2;
    deductions.push({ reason: `${summary.warningLevel} warning-level issue(s)`, points: -(summary.warningLevel * 2) });
  }

  // Missing disclaimers
  if (summary.disclaimersMissing) {
    score -= 5;
    deductions.push({ reason: 'No legal/medical disclaimers found', points: -5 });
  }

  return {
    score: Math.max(0, score),
    maxScore: 25,
    status: score >= 20 ? 'GOOD' : score >= 12 ? 'WARNING' : 'POOR',
    details: `${summary.blockLevel} block, ${summary.warningLevel} warning, ${summary.infoLevel} info issues`,
    deductions,
  };
}

/**
 * Score consistency (0-15 points)
 */
function scoreConsistency(report) {
  if (!report || report.overallStatus === 'ERROR') {
    return { score: 0, maxScore: 15, status: 'ERROR', details: 'Consistency report not available or errored.' };
  }

  const { summary } = report;
  if (!summary) {
    return { score: 0, maxScore: 15, status: 'ERROR', details: 'Consistency report has no summary.' };
  }

  let score = 15;
  const deductions = [];

  if (summary.blocks > 0) {
    score = 0;
    deductions.push({
      reason: `${summary.blocks} block-level consistency issue(s)`,
      points: -15,
      isBlock: true,
    });
    return { score: 0, maxScore: 15, status: 'BLOCK', details: 'Block-level consistency issues.', deductions };
  }

  if (summary.warnings > 3) {
    score -= Math.min(10, summary.warnings * 2);
    deductions.push({ reason: `${summary.warnings} consistency warnings`, points: -Math.min(10, summary.warnings * 2) });
  } else if (summary.warnings > 0) {
    score -= summary.warnings * 2;
    deductions.push({ reason: `${summary.warnings} consistency warning(s)`, points: -(summary.warnings * 2) });
  }

  if (summary.info > 5) {
    score -= 2;
    deductions.push({ reason: 'Multiple informational consistency notes', points: -2 });
  }

  return {
    score: Math.max(0, score),
    maxScore: 15,
    status: score >= 12 ? 'GOOD' : score >= 8 ? 'WARNING' : 'POOR',
    details: `${summary.passed} passed, ${summary.warnings} warnings, ${summary.info} info`,
    deductions,
  };
}

/**
 * Score formatting/structure (0-10 points) - standalone check on the article
 */
function scoreFormatting(article) {
  const text = article.body || article.content || '';
  const title = article.title || article.headline || '';

  let score = 10;
  const deductions = [];

  // Check article has a title
  if (!title || title.trim().length === 0) {
    score -= 3;
    deductions.push({ reason: 'Missing article title', points: -3 });
  } else if (title.length > 120) {
    score -= 1;
    deductions.push({ reason: 'Title exceeds 120 characters', points: -1 });
  }

  // Check minimum content length
  if (text.length < 300) {
    score -= 5;
    deductions.push({ reason: 'Article body is very short (< 300 chars)', points: -5 });
  } else if (text.length < 800) {
    score -= 2;
    deductions.push({ reason: 'Article body is short (< 800 chars)', points: -2 });
  }

  // Check for headings/structure
  const hasHeadings = /^#{1,6}\s+/m.test(text);
  if (text.length > 2000 && !hasHeadings) {
    score -= 2;
    deductions.push({ reason: 'Long article without headings for structure', points: -2 });
  }

  // Check for summary/meta fields
  if (!article.summary && !article.description && !article.excerpt) {
    score -= 1;
    deductions.push({ reason: 'Missing article summary/description', points: -1 });
  }

  // Check for category/tags
  if (!article.category && (!article.tags || article.tags.length === 0)) {
    score -= 1;
    deductions.push({ reason: 'Missing category and tags', points: -1 });
  }

  return {
    score: Math.max(0, score),
    maxScore: 10,
    status: score >= 8 ? 'GOOD' : score >= 5 ? 'WARNING' : 'POOR',
    details: 'Formatting and structure assessment',
    deductions,
  };
}

// ---------------------------------------------------------------------------
// Report assembly
// ---------------------------------------------------------------------------

function assembleScorecard(article, categoryScores) {
  const totalScore = Object.values(categoryScores).reduce((sum, cat) => sum + cat.score, 0);
  const maxScore = Object.values(categoryScores).reduce((sum, cat) => sum + cat.maxScore, 0);

  // Check for any BLOCK-level issues across all categories
  const hasBlockIssues = Object.values(categoryScores).some(cat => cat.status === 'BLOCK');
  const hasErrors = Object.values(categoryScores).some(cat => cat.status === 'ERROR');

  // Collect all block-level deductions
  const blockItems = [];
  for (const [category, scores] of Object.entries(categoryScores)) {
    const blocks = (scores.deductions || []).filter(d => d.isBlock);
    for (const block of blocks) {
      blockItems.push({ category, reason: block.reason });
    }
  }

  // Determine publish readiness
  let publishReadiness;
  let readinessReason;

  if (hasBlockIssues) {
    publishReadiness = 'BLOCK';
    readinessReason = `BLOCK-level issues found: ${blockItems.map(b => b.reason).join('; ')}`;
  } else if (totalScore < 60) {
    publishReadiness = 'BLOCK';
    readinessReason = `Overall score ${totalScore} is below minimum threshold of 60.`;
  } else if (totalScore < 85 || hasErrors) {
    publishReadiness = 'NEEDS_REVISION';
    readinessReason = totalScore < 85
      ? `Score ${totalScore} is below READY threshold of 85.`
      : 'One or more QA reports encountered errors.';
  } else {
    publishReadiness = 'READY';
    readinessReason = `Score ${totalScore} meets threshold. No block-level issues.`;
  }

  // Collect required revisions
  const requiredRevisions = [];
  for (const [category, scores] of Object.entries(categoryScores)) {
    for (const deduction of (scores.deductions || [])) {
      if (deduction.isBlock || deduction.points <= -5) {
        requiredRevisions.push({
          category,
          issue: deduction.reason,
          priority: deduction.isBlock ? 'CRITICAL' : 'HIGH',
        });
      }
    }
  }

  // Flagged items summary
  const flaggedItems = [];
  for (const [category, scores] of Object.entries(categoryScores)) {
    for (const deduction of (scores.deductions || [])) {
      flaggedItems.push({
        category,
        issue: deduction.reason,
        pointsDeducted: Math.abs(deduction.points),
        isBlock: deduction.isBlock || false,
      });
    }
  }

  return {
    overallScore: totalScore,
    maxPossibleScore: maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    assessmentMode: 'editorial-triage',
    publishReadiness,
    readinessReason,
    categoryScores: Object.fromEntries(
      Object.entries(categoryScores).map(([key, val]) => [
        key,
        { score: val.score, maxScore: val.maxScore, status: val.status, details: val.details },
      ])
    ),
    requiredRevisions,
    flaggedItems,
    blockItems,
  };
}

// ---------------------------------------------------------------------------
// Input loading
// ---------------------------------------------------------------------------

async function loadInputs(args) {
  // --stdin mode: expects combined JSON
  if (args.includes('--stdin')) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
    return {
      article: data.article,
      reports: {
        citation: data.reports?.citation || data.reports?.['citation-checker'] || null,
        claim: data.reports?.claim || data.reports?.['claim-validator'] || null,
        legal: data.reports?.legal || data.reports?.['legal-language-checker'] || null,
        consistency: data.reports?.consistency || data.reports?.['consistency-checker'] || null,
      },
    };
  }

  // File-based mode
  const articlePath = args.find(a => !a.startsWith('--'));
  if (!articlePath) {
    throw new Error(
      'Usage: quality-scorer.mjs <article.json> ' +
      '[--citation-report <file>] [--claim-report <file>] ' +
      '[--legal-report <file>] [--consistency-report <file>]'
    );
  }

  const article = JSON.parse(await readFile(resolve(articlePath), 'utf-8'));

  async function loadReport(flag) {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx + 1 >= args.length) return null;
    try {
      return JSON.parse(await readFile(resolve(args[idx + 1]), 'utf-8'));
    } catch (err) {
      process.stderr.write(`[quality-scorer] Warning: Could not load ${flag} report: ${err.message}\n`);
      return null;
    }
  }

  return {
    article,
    reports: {
      citation: await loadReport('--citation-report'),
      claim: await loadReport('--claim-report'),
      legal: await loadReport('--legal-report'),
      consistency: await loadReport('--consistency-report'),
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const args = process.argv.slice(2);

  try {
    process.stderr.write('[quality-scorer] Loading inputs...\n');
    const { article, reports } = await loadInputs(args);

    if (!article) {
      throw new Error('Article data is required.');
    }

    const title = article.title || article.headline || '(untitled)';
    process.stderr.write(`[quality-scorer] Scoring: "${title}"\n`);

    // Score each category
    process.stderr.write('[quality-scorer] Scoring citation accuracy...\n');
    const citationScore = scoreCitations(reports.citation);

    process.stderr.write('[quality-scorer] Scoring factual reliability...\n');
    const claimScore = scoreClaims(reports.claim);

    process.stderr.write('[quality-scorer] Scoring legal compliance...\n');
    const legalScore = scoreLegalCompliance(reports.legal);

    process.stderr.write('[quality-scorer] Scoring consistency...\n');
    const consistencyScore = scoreConsistency(reports.consistency);

    process.stderr.write('[quality-scorer] Scoring formatting...\n');
    const formattingScore = scoreFormatting(article);

    const categoryScores = {
      citationAccuracy: citationScore,
      factualReliability: claimScore,
      legalCompliance: legalScore,
      consistency: consistencyScore,
      formatting: formattingScore,
    };

    // Assemble scorecard
    process.stderr.write('[quality-scorer] Assembling scorecard...\n');
    const scorecard = assembleScorecard(article, categoryScores);

    const report = {
      agent: 'quality-scorer',
      timestamp: new Date().toISOString(),
      methodology: {
        mode: 'editorial-triage',
        note: 'QA scores rank editorial risk and revision priority. They do not constitute independent factual verification.',
      },
      article: {
        title,
        id: article.id || null,
        category: article.category || null,
      },
      scorecard,
      inputReports: {
        citationChecker: reports.citation ? 'loaded' : 'missing',
        claimValidator: reports.claim ? 'loaded' : 'missing',
        legalLanguageChecker: reports.legal ? 'loaded' : 'missing',
        consistencyChecker: reports.consistency ? 'loaded' : 'missing',
      },
    };

    // Save report to output/qa-reports/
    try {
      await mkdir(QA_REPORTS_DIR, { recursive: true });
      const articleId = article.id || title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 50);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = resolve(QA_REPORTS_DIR, `qa-${articleId}-${timestamp}.json`);
      await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      process.stderr.write(`[quality-scorer] Report saved to: ${reportPath}\n`);
      report.reportPath = reportPath;
    } catch (saveErr) {
      process.stderr.write(`[quality-scorer] Warning: Could not save report: ${saveErr.message}\n`);
    }

    process.stderr.write(
      `[quality-scorer] Final score: ${scorecard.overallScore}/${scorecard.maxPossibleScore} ` +
      `(${scorecard.percentage}%) - ${scorecard.publishReadiness}\n`
    );

    process.stdout.write(JSON.stringify(report, null, 2) + '\n');

    // Exit with non-zero if BLOCK
    if (scorecard.publishReadiness === 'BLOCK') {
      process.exit(2);
    }
  } catch (err) {
    const errorReport = {
      agent: 'quality-scorer',
      timestamp: new Date().toISOString(),
      error: err.message,
      scorecard: { publishReadiness: 'ERROR' },
    };
    process.stderr.write(`[quality-scorer] ERROR: ${err.message}\n`);
    process.stdout.write(JSON.stringify(errorReport, null, 2) + '\n');
    process.exit(1);
  }
}

run();
