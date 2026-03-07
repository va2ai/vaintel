#!/usr/bin/env node

/**
 * title-generator.mjs
 *
 * Takes a research dossier or draft JSON as input.
 * Generates 5-10 title/headline options with deks and scores.
 * Outputs ranked title options as JSON to stdout.
 *
 * Usage:
 *   node scripts/content-pipeline/agents/title-generator.mjs <input.json> [--type draft|dossier]
 *
 * The input can be either:
 *   - A draft JSON file (with body, section, category fields)
 *   - A research dossier JSON file (raw research material)
 *
 * Use --type to specify explicitly. Default: auto-detect based on presence of "body" field.
 *
 * Environment:
 *   OPENAI_API_KEY  - Required
 *   OPENAI_MODEL    - Optional (default: gpt-4o)
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTitlePrompt } from '../templates/system-prompts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(...args) {
  process.stderr.write(`[title-generator] ${args.join(' ')}\n`);
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

async function callOpenAI(systemPrompt, userPrompt, temperature = 0.8) {
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
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  let inputPath = null;
  let inputType = null;
  let useStdin = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && i + 1 < args.length) {
      inputType = args[++i];
    } else if (args[i] === '--stdin') {
      useStdin = true;
    } else if (!args[i].startsWith('-')) {
      inputPath = args[i];
    }
  }

  if (!inputPath && !useStdin) {
    fatal('Usage: node title-generator.mjs <input.json> [--type draft|dossier] or --stdin');
  }

  return { inputPath, inputType, useStdin };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { inputPath, inputType, useStdin } = parseArgs(process.argv);

  log('Loading style guide...');
  const styleGuide = await loadJSON(join(ROOT, 'config', 'style-guide.json'));

  let input;
  if (useStdin) {
    log('Reading input from stdin...');
    input = await readStdin();
  } else {
    log(`Loading input: ${inputPath}`);
    input = await loadJSON(inputPath);
  }

  // Auto-detect input type
  const detectedType = inputType || (input.body ? 'draft' : 'dossier');
  log(`Input type: ${detectedType}`);

  // Build the content object for the prompt builder
  let content;
  if (detectedType === 'draft') {
    content = {
      body: input.body,
      section: input.section,
      category: input.category,
      researchDossier: null,
    };
  } else {
    content = {
      body: null,
      section: input.suggestedSection || input.section || null,
      category: input.suggestedCategory || input.category || null,
      researchDossier: input,
    };
  }

  const systemPrompt = buildTitlePrompt(styleGuide, content);
  const userPrompt = 'Generate 5-10 ranked title options with deks and scores. Return only the JSON object.';

  const result = await callOpenAI(systemPrompt, userPrompt, 0.8);

  // Validate and sort by totalScore
  if (result.titles && Array.isArray(result.titles)) {
    result.titles.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    log(`Generated ${result.titles.length} title options`);
    log(`Top title: "${result.titles[0].headline}" (score: ${result.titles[0].totalScore})`);
  } else {
    log('Warning: response did not contain expected "titles" array');
  }

  // Output JSON to stdout
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch(err => {
  fatal(`Unhandled error: ${err.message}`);
});
