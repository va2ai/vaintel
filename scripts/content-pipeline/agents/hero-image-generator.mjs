#!/usr/bin/env node

/**
 * hero-image-generator.mjs
 *
 * Generates a hero image for a draft using Gemini image generation and writes
 * the file to public/images so the frontend can serve it immediately.
 *
 * Environment:
 *   GEMINI_API_KEY       - Required to generate images
 *   GEMINI_IMAGE_MODEL   - Optional, defaults to gemini-3.1-flash-image-preview
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..', '..');

function log(...args) {
  process.stderr.write(`[hero-image-generator] ${args.join(' ')}\n`);
}

function fatal(msg) {
  log(`ERROR: ${msg}`);
  process.exit(1);
}

function slugify(text) {
  return String(text || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function parseArgs(argv) {
  const opts = { stdin: false, draftPath: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--stdin') opts.stdin = true;
    else if (!argv[i].startsWith('--') && !opts.draftPath) opts.draftPath = argv[i];
  }
  return opts;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

async function loadDraft(opts) {
  if (opts.stdin) return readStdin();
  if (!opts.draftPath) fatal('No draft provided. Use --stdin or pass a draft path.');
  return JSON.parse(await readFile(opts.draftPath, 'utf-8'));
}

function buildPrompt(draft) {
  const category = draft.category || draft.section || 'Veterans claims';
  const title = draft.title || 'Veterans claims article';
  const summary = draft.summary || draft.excerpt || '';
  return [
    'Create a polished editorial hero image for a veterans disability claims publication.',
    `Article title: ${title}`,
    `Category: ${category}`,
    `Summary: ${summary}`,
    'Style: clean editorial illustration, serious and trustworthy, modern newsroom feature art.',
    'Show symbolic objects or scenes related to the topic, not literal screenshots of documents.',
    'No text, no letters, no logos, no watermarks, no UI, no patriotic cliches, no stock-photo look.',
    'Use a restrained palette with strong contrast and clear focal composition for a website hero image.',
    'Aspect ratio should feel wide and suitable for a news/article header.'
  ].join('\n');
}

async function generateImage(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log('GEMINI_API_KEY not set. Skipping hero image generation.');
    return null;
  }

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.8,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API ${response.status}: ${body}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini did not return image bytes.');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

async function saveImage(draft, imageBytes) {
  const imageDir = join(ROOT, 'public', 'images');
  await mkdir(imageDir, { recursive: true });

  const prefix = typeof draft.id === 'string' && draft.id.startsWith('n') ? 'news' : 'post';
  const fileName = `${prefix}-${slugify(draft.title)}-hero.png`;
  const absolutePath = join(imageDir, fileName);

  const processed = await sharp(imageBytes)
    .resize(1600, 900, { fit: 'cover', position: 'attention' })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  await writeFile(absolutePath, processed);
  return `/images/${fileName}`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const draft = await loadDraft(opts);
  const prompt = buildPrompt(draft);
  const bytes = await generateImage(prompt);

  if (!bytes) {
    process.stdout.write(JSON.stringify({
      generated: false,
      skipped: true,
      reason: 'missing_gemini_api_key',
      heroImage: draft.heroImage || null,
    }, null, 2));
    return;
  }

  const heroImage = await saveImage(draft, bytes);
  process.stdout.write(JSON.stringify({
    generated: true,
    heroImage,
    prompt,
  }, null, 2));
}

main().catch((err) => fatal(err.stack || err.message));
