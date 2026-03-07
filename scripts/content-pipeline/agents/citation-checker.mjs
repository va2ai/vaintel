#!/usr/bin/env node

/**
 * citation-checker.mjs
 *
 * QA agent that extracts and validates all citations in a draft article.
 * Checks CFR references, CAVC case names, VA form numbers, and statute
 * references against known valid values.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/citation-checker.mjs <path-to-article.json>
 *   echo '{"body":"..."}' | node scripts/content-pipeline/agents/citation-checker.mjs --stdin
 *
 * Output: JSON citation report to stdout
 * Status: logged to stderr
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  isValidCFR,
  findCAVCCase,
  isValidVAForm,
  ALL_VALID_CFR,
  KNOWN_CAVC_CASES,
  VA_FORMS,
} from '../lib/known-references.mjs';
import { verifyCAVCCase } from '../lib/bva-api-client.mjs';

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract all 38 CFR references from text.
 * Matches patterns like: 38 CFR 3.303, 38 C.F.R. § 4.16, CFR 3.310
 */
function extractCFRReferences(text) {
  const patterns = [
    /38\s+C\.?F\.?R\.?\s*§?\s*(\d+\.\d+[a-z]?)/gi,
    /(?:(?:^|[^0-9])C\.?F\.?R\.?\s*§?\s*)(\d+\.\d+[a-z]?)/gi,
    /§\s*(\d+\.\d+[a-z]?)\b/gi,
  ];

  const refs = new Map(); // section -> array of match contexts

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const section = match[1];
      const start = Math.max(0, match.index - 40);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(start, end).replace(/\n/g, ' ').trim();

      if (!refs.has(section)) {
        refs.set(section, []);
      }
      refs.get(section).push(context);
    }
  }

  return refs;
}

/**
 * Extract CAVC case citations from text.
 * Matches patterns like: Gilbert v. Derwinski, Smith v. Shinseki
 */
function extractCAVCCitations(text) {
  // Standard case citation: Name v. Name
  const casePattern = /([A-Z][a-zA-Z''-]+)\s+v\.\s+([A-Z][a-zA-Z''-]+)/g;
  const cases = new Map();

  let match;
  while ((match = casePattern.exec(text)) !== null) {
    const caseName = `${match[1]} v. ${match[2]}`;
    const start = Math.max(0, match.index - 20);
    const end = Math.min(text.length, match.index + match[0].length + 60);
    const context = text.slice(start, end).replace(/\n/g, ' ').trim();

    if (!cases.has(caseName)) {
      cases.set(caseName, []);
    }
    cases.get(caseName).push(context);
  }

  return cases;
}

/**
 * Extract VA form references from text.
 * Matches patterns like: VA Form 21-526EZ, Form 21-0966
 */
function extractVAFormReferences(text) {
  const patterns = [
    /VA\s+Form\s+([\d][\d\w-]+)/gi,
    /Form\s+([\d][\d\w-]+)/gi,
  ];

  const forms = new Map();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const formNumber = match[1];
      const fullRef = `VA Form ${formNumber}`;
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(start, end).replace(/\n/g, ' ').trim();

      if (!forms.has(fullRef)) {
        forms.set(fullRef, []);
      }
      forms.get(fullRef).push(context);
    }
  }

  return forms;
}

/**
 * Extract statute references (38 USC / U.S.C.)
 */
function extractStatuteReferences(text) {
  const patterns = [
    /38\s+U\.?S\.?C\.?\s*§?\s*([\d]+[a-z]?)/gi,
    /(?:Title\s+38)[,\s]+(?:Section|§)\s*([\d]+[a-z]?)/gi,
  ];

  const statutes = new Map();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const section = `38 USC § ${match[1]}`;
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 40);
      const context = text.slice(start, end).replace(/\n/g, ' ').trim();

      if (!statutes.has(section)) {
        statutes.set(section, []);
      }
      statutes.get(section).push(context);
    }
  }

  return statutes;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateCFR(cfrRefs) {
  const results = [];

  for (const [section, contexts] of cfrRefs) {
    const valid = isValidCFR(section);
    results.push({
      type: 'CFR',
      reference: `38 CFR ${section}`,
      status: valid ? 'VERIFIED' : 'FLAGGED',
      severity: valid ? 'OK' : 'WARNING',
      occurrences: contexts.length,
      contexts: contexts.slice(0, 3), // limit context samples
      message: valid
        ? `Valid 38 CFR section ${section}`
        : `Section ${section} not found in known valid 38 CFR sections. May be invalid or may need manual verification.`,
    });
  }

  return results;
}

async function validateCAVC(cavcRefs) {
  const results = [];

  for (const [caseName, contexts] of cavcRefs) {
    const known = findCAVCCase(caseName);
    const namePattern = /^[A-Z][a-zA-Z''-]+\s+v\.\s+[A-Z][a-zA-Z''-]+$/;
    const validFormat = namePattern.test(caseName);

    let status, severity, message, efilingData = null;

    if (known) {
      status = 'VERIFIED';
      severity = 'OK';
      message = `Known CAVC case: ${known.name}, ${known.citation} (${known.topic})`;
    } else if (validFormat) {
      // Try to verify against live CAVC eFiling system
      const lastName = caseName.split(' v.')[0].trim();
      process.stderr.write(`[citation-checker] Checking CAVC eFiling for "${lastName}"...\n`);
      try {
        const efilingResult = await verifyCAVCCase(lastName);
        if (efilingResult) {
          status = 'VERIFIED';
          severity = 'OK';
          message = `Case "${caseName}" verified via CAVC eFiling: ${efilingResult.case_number} - ${efilingResult.title}`;
          efilingData = {
            caseNumber: efilingResult.case_number,
            title: efilingResult.title,
            openingDate: efilingResult.opening_date,
          };
        } else {
          status = 'UNVERIFIED';
          severity = 'INFO';
          message = `Case "${caseName}" has valid format but not found in known database or CAVC eFiling. May be older case or variant spelling.`;
        }
      } catch {
        status = 'UNVERIFIED';
        severity = 'INFO';
        message = `Case "${caseName}" has valid format but could not be verified (CAVC eFiling unavailable). Manual verification recommended.`;
      }
    } else {
      status = 'FLAGGED';
      severity = 'WARNING';
      message = `Case citation "${caseName}" has unusual formatting. Verify correctness.`;
    }

    results.push({
      type: 'CAVC_CASE',
      reference: caseName,
      status,
      severity,
      occurrences: contexts.length,
      contexts: contexts.slice(0, 3),
      message,
      knownCitation: known?.citation || null,
      efilingData,
    });
  }

  return results;
}

function validateVAForms(formRefs) {
  const results = [];

  for (const [formRef, contexts] of formRefs) {
    const valid = isValidVAForm(formRef);
    const formName = valid
      ? [...VA_FORMS.entries()].find(([k]) =>
          k.toLowerCase().includes(formRef.replace(/^VA Form /i, '').toLowerCase())
        )?.[1]
      : null;

    results.push({
      type: 'VA_FORM',
      reference: formRef,
      status: valid ? 'VERIFIED' : 'FLAGGED',
      severity: valid ? 'OK' : 'WARNING',
      occurrences: contexts.length,
      contexts: contexts.slice(0, 3),
      message: valid
        ? `Valid VA form: ${formRef} - ${formName}`
        : `Form "${formRef}" not found in known VA forms database. May be invalid or may need manual verification.`,
    });
  }

  return results;
}

function validateStatutes(statuteRefs) {
  const results = [];

  for (const [section, contexts] of statuteRefs) {
    // We can't fully validate statutes without a complete database,
    // but we can flag format issues
    results.push({
      type: 'STATUTE',
      reference: section,
      status: 'UNVERIFIED',
      severity: 'INFO',
      occurrences: contexts.length,
      contexts: contexts.slice(0, 3),
      message: `Statute reference found. Manual verification recommended for accuracy.`,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function loadArticle(args) {
  // Check for --stdin flag
  if (args.includes('--stdin')) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  }

  // Otherwise read from file path
  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    throw new Error('Usage: citation-checker.mjs <path-to-article.json> or --stdin');
  }
  const resolved = resolve(filePath);
  const raw = await readFile(resolved, 'utf-8');
  return JSON.parse(raw);
}

async function run() {
  const args = process.argv.slice(2);

  try {
    process.stderr.write('[citation-checker] Loading article...\n');
    const article = await loadArticle(args);

    if (!article.body && !article.content) {
      throw new Error('Article must have a "body" or "content" field.');
    }

    const text = article.body || article.content;
    const title = article.title || article.headline || '(untitled)';

    process.stderr.write(`[citation-checker] Analyzing: "${title}"\n`);

    // Extract all citations
    process.stderr.write('[citation-checker] Extracting CFR references...\n');
    const cfrRefs = extractCFRReferences(text);

    process.stderr.write('[citation-checker] Extracting CAVC citations...\n');
    const cavcRefs = extractCAVCCitations(text);

    process.stderr.write('[citation-checker] Extracting VA form references...\n');
    const formRefs = extractVAFormReferences(text);

    process.stderr.write('[citation-checker] Extracting statute references...\n');
    const statuteRefs = extractStatuteReferences(text);

    // Validate all
    process.stderr.write('[citation-checker] Validating citations...\n');
    const cfrResults = validateCFR(cfrRefs);
    const cavcResults = await validateCAVC(cavcRefs);
    const formResults = validateVAForms(formRefs);
    const statuteResults = validateStatutes(statuteRefs);

    const allResults = [...cfrResults, ...cavcResults, ...formResults, ...statuteResults];

    const verified = allResults.filter(r => r.status === 'VERIFIED').length;
    const flagged = allResults.filter(r => r.status === 'FLAGGED').length;
    const unverified = allResults.filter(r => r.status === 'UNVERIFIED').length;
    const blockLevel = allResults.filter(r => r.severity === 'BLOCK').length;

    const report = {
      agent: 'citation-checker',
      timestamp: new Date().toISOString(),
      article: { title, id: article.id || null },
      summary: {
        totalCitations: allResults.length,
        verified,
        flagged,
        unverified,
        blockLevelIssues: blockLevel,
        byType: {
          cfr: cfrResults.length,
          cavc: cavcResults.length,
          vaForms: formResults.length,
          statutes: statuteResults.length,
        },
      },
      overallStatus: blockLevel > 0 ? 'BLOCK' : flagged > 0 ? 'NEEDS_REVIEW' : 'PASS',
      citations: allResults,
    };

    process.stderr.write(
      `[citation-checker] Complete: ${verified} verified, ${flagged} flagged, ${unverified} unverified out of ${allResults.length} total\n`
    );

    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (err) {
    const errorReport = {
      agent: 'citation-checker',
      timestamp: new Date().toISOString(),
      error: err.message,
      overallStatus: 'ERROR',
    };
    process.stderr.write(`[citation-checker] ERROR: ${err.message}\n`);
    process.stdout.write(JSON.stringify(errorReport, null, 2) + '\n');
    process.exit(1);
  }
}

run();
