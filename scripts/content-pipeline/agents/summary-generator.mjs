#!/usr/bin/env node

/**
 * summary-generator.mjs
 *
 * Takes a draft JSON file (with body and title) as input.
 * Generates: excerpt, summary, and section-by-section summaries.
 * Outputs structured JSON to stdout.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/summary-generator.mjs <draft.json>
 *
 * Environment:
 *   OPENAI_API_KEY  - Required
 *   OPENAI_MODEL    - Optional (default: gpt-4o)
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSummaryPrompt } from '../templates/system-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args) {
  process.stderr.write(`[summary-generator] ${args.join(' ')}\n`);
}

function fatal(msg) {
  log(`ERROR: ${msg}`);
  process.exit(1);
}

async function loadJSON(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// OpenAI API call
// ---------------------------------------------------------------------------

async function callOpenAI(systemPrompt, userPrompt, temperature = 0.3) {
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
    max_tokens: 4096,
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

  log(`Response received. Tokens: prompt=${data.usage?.prompt_tokens}, completion=${data.usage?.completion_tokens}`);

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
// Validation
// ---------------------------------------------------------------------------

function validateSummaryOutput(result) {
  const issues = [];

  if (!result.excerpt || typeof result.excerpt !== 'string') {
    issues.push('Missing or invalid "excerpt" field');
  } else if (result.excerpt.length > 300) {
    issues.push(`Excerpt too long: ${result.excerpt.length} chars (max 280 recommended)`);
  }

  if (!result.summary || typeof result.summary !== 'string') {
    issues.push('Missing or invalid "summary" field');
  } else if (result.summary.length > 550) {
    issues.push(`Summary too long: ${result.summary.length} chars (max 500 recommended)`);
  }

  if (!result.sectionSummaries || !Array.isArray(result.sectionSummaries)) {
    issues.push('Missing or invalid "sectionSummaries" array');
  } else {
    for (const [i, s] of result.sectionSummaries.entries()) {
      if (!s.heading) issues.push(`Section summary ${i} missing "heading"`);
      if (!s.summary) issues.push(`Section summary ${i} missing "summary"`);
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

async function main() {
  const args = process.argv.slice(2);
  const useStdin = args.includes('--stdin');

  if (!useStdin && args.filter(a => !a.startsWith('--')).length < 1) {
    fatal('Usage: node summary-generator.mjs <draft.json> or --stdin');
  }

  log('Loading style guide...');
  const styleGuide = await loadJSON(join(ROOT, 'config', 'style-guide.json'));

  let draft;
  if (useStdin) {
    log('Reading draft from stdin...');
    draft = await readStdin();
  } else {
    const inputPath = args.find(a => !a.startsWith('--'));
    log(`Loading draft: ${inputPath}`);
    draft = await loadJSON(inputPath);
  }

  if (!draft.body) {
    fatal('Input JSON must have a "body" field containing the article text');
  }

  const content = {
    body: draft.body,
    title: draft.title || 'Untitled',
  };

  const systemPrompt = buildSummaryPrompt(styleGuide, content);
  const userPrompt = 'Generate the excerpt, summary, and section-by-section summaries for this article. Return only the JSON object.';

  const result = await callOpenAI(systemPrompt, userPrompt, 0.3);

  // Validate output
  const issues = validateSummaryOutput(result);
  if (issues.length > 0) {
    log('Validation warnings:');
    issues.forEach(issue => log(`  - ${issue}`));
  }

  // Log summary stats
  log(`Excerpt: ${result.excerpt?.length || 0} chars`);
  log(`Summary: ${result.summary?.length || 0} chars`);
  log(`Section summaries: ${result.sectionSummaries?.length || 0}`);

  // Output JSON to stdout
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch(err => {
  fatal(`Unhandled error: ${err.message}`);
});
