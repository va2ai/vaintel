#!/usr/bin/env node
/**
 * V2V Content Pipeline Orchestrator
 *
 * Master pipeline that coordinates the three layers:
 *   1. Research Pipeline  - discover, cluster, compile research
 *   2. AI Writing System  - generate drafts from research packets
 *   3. QA/Verification    - validate, score, and approve drafts
 *
 * Usage:
 *   node scripts/content-pipeline/pipeline.mjs --mode full
 *   node scripts/content-pipeline/pipeline.mjs --mode research-only
 *   node scripts/content-pipeline/pipeline.mjs --mode draft --dossier output/research/topic-xyz.json
 *   node scripts/content-pipeline/pipeline.mjs --mode qa --draft output/drafts/draft-xyz.json
 *   node scripts/content-pipeline/pipeline.mjs --mode single --topic "CAVC ruling on sleep apnea nexus"
 *
 * Environment:
 *   OPENAI_API_KEY  - Required for draft generation and claim validation
 *   PIPELINE_MODEL  - OpenAI model to use (default: gpt-4o)
 */

import { Worker } from 'node:worker_threads';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// ── CLI parsing ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    mode: 'full',
    dossier: null,
    draft: null,
    topic: null,
    type: 'post',       // post | news
    articleType: null,   // cavc-analysis | policy-update | claims-strategy | explainer | opinion
    source: null,        // specific source ID for research
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mode':       opts.mode = args[++i]; break;
      case '--dossier':    opts.dossier = args[++i]; break;
      case '--draft':      opts.draft = args[++i]; break;
      case '--topic':      opts.topic = args[++i]; break;
      case '--type':       opts.type = args[++i]; break;
      case '--article-type': opts.articleType = args[++i]; break;
      case '--source':     opts.source = args[++i]; break;
      case '--dry-run':    opts.dryRun = true; break;
      case '--verbose':    opts.verbose = true; break;
      case '--help':       printHelp(); process.exit(0);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`
V2V Content Pipeline Orchestrator
==================================

Modes:
  full            Run complete pipeline: research -> draft -> QA
  research-only   Run only research pipeline (source scan + topic detection)
  draft           Generate draft from existing research dossier
  qa              Run QA checks on existing draft
  single          Quick pipeline: topic string -> research -> draft -> QA
  scan            Just scan sources for new items (no clustering)
  review          Generate QA report for all pending drafts

Options:
  --mode <mode>         Pipeline mode (default: full)
  --dossier <path>      Path to research dossier JSON (for draft mode)
  --draft <path>        Path to draft JSON (for qa mode)
  --topic <string>      Topic string (for single mode)
  --type <post|news>    Content type (default: post)
  --article-type <type> Article subtype (cavc-analysis, policy-update, etc.)
  --source <id>         Specific source to scan
  --dry-run             Show what would happen without executing
  --verbose             Show detailed output from each agent
  --help                Show this help

Examples:
  # Full pipeline: scan sources, find topics, research top one, draft, QA
  node scripts/content-pipeline/pipeline.mjs --mode full

  # Research only: scan and cluster topics
  node scripts/content-pipeline/pipeline.mjs --mode research-only

  # Draft from existing research
  node scripts/content-pipeline/pipeline.mjs --mode draft --dossier output/research/topic-2026-03-07-cavc-sleep.json

  # QA check an existing draft
  node scripts/content-pipeline/pipeline.mjs --mode qa --draft output/drafts/draft-012.json

  # End-to-end from a topic string
  node scripts/content-pipeline/pipeline.mjs --mode single --topic "New CAVC ruling on sleep apnea nexus letters"
  `);
}

// ── Logging ──────────────────────────────────────────────────────────────

const log = (msg) => process.stderr.write(`[pipeline] ${msg}\n`);
const resolvePath = (p) => isAbsolute(p) ? p : join(__dirname, p);
const logStep = (step, msg) => process.stderr.write(`\n${'='.repeat(60)}\n[${step}] ${msg}\n${'='.repeat(60)}\n`);

// ── Agent runner ─────────────────────────────────────────────────────────

async function runAgent(agentPath, args = [], input = null, { timeout = 120_000 } = {}) {
  const fullPath = join(__dirname, agentPath);
  const inputStr = input != null
    ? (typeof input === 'string' ? input : JSON.stringify(input))
    : null;

  const workerSource = `
    import { parentPort, workerData } from 'node:worker_threads';
    import { Readable } from 'node:stream';
    import { pathToFileURL } from 'node:url';

    class AgentExit extends Error {
      constructor(code = 0) {
        super('Agent exit');
        this.code = code;
      }
    }

    let stdout = '';
    let stderr = '';
    let settled = false;
    let moduleImported = false;

    function finish(payload) {
      if (settled) return;
      settled = true;
      parentPort.postMessage(payload);
    }

    const originalArgv = process.argv;
    const originalExit = process.exit;
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    const originalStdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin');

    const fakeStdin = workerData.input != null
      ? Readable.from([Buffer.from(workerData.input, 'utf8')])
      : Readable.from([]);
    fakeStdin.isTTY = workerData.input == null;

    process.argv = ['node', workerData.filePath, ...workerData.args];
    process.exit = (code = 0) => { throw new AgentExit(code); };
    process.stdout.write = (chunk, encoding, cb) => {
      stdout += Buffer.isBuffer(chunk) ? chunk.toString(encoding || 'utf8') : chunk;
      if (typeof cb === 'function') cb();
      return true;
    };
    process.stderr.write = (chunk, encoding, cb) => {
      stderr += Buffer.isBuffer(chunk) ? chunk.toString(encoding || 'utf8') : chunk;
      if (typeof cb === 'function') cb();
      return true;
    };
    Object.defineProperty(process, 'stdin', {
      configurable: true,
      enumerable: true,
      value: fakeStdin,
    });

    function restore() {
      process.argv = originalArgv;
      process.exit = originalExit;
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
      if (originalStdinDescriptor) {
        Object.defineProperty(process, 'stdin', originalStdinDescriptor);
      }
    }

    process.on('uncaughtException', (err) => {
      if (err instanceof AgentExit) {
        restore();
        finish({ ok: err.code === 0, code: err.code, stdout, stderr, imported: moduleImported });
        return;
      }
      restore();
      finish({
        ok: false,
        code: 1,
        stdout,
        stderr: stderr + (stderr ? '\\n' : '') + (err?.stack || String(err)),
        imported: moduleImported,
      });
    });

    process.on('unhandledRejection', (reason) => {
      if (reason instanceof AgentExit) {
        restore();
        finish({ ok: reason.code === 0, code: reason.code, stdout, stderr, imported: moduleImported });
        return;
      }
      restore();
      finish({
        ok: false,
        code: 1,
        stdout,
        stderr: stderr + (stderr ? '\\n' : '') + ((reason && reason.stack) || String(reason)),
        imported: moduleImported,
      });
    });

    process.on('beforeExit', () => {
      restore();
      finish({ ok: true, code: process.exitCode || 0, stdout, stderr, imported: moduleImported });
    });

    try {
      const fileUrl = pathToFileURL(workerData.filePath);
      fileUrl.searchParams.set('pipeline_run', workerData.runId);
      await import(fileUrl.href);
      moduleImported = true;
    } catch (err) {
      restore();
      if (err instanceof AgentExit) {
        finish({ ok: err.code === 0, code: err.code, stdout, stderr, imported: moduleImported });
      } else {
        finish({
          ok: false,
          code: 1,
          stdout,
          stderr: stderr + (stderr ? '\\n' : '') + (err?.stack || String(err)),
          imported: moduleImported,
        });
      }
    }
  `;

  return new Promise((resolve) => {
    const worker = new Worker(workerSource, {
      eval: true,
      workerData: {
        filePath: fullPath,
        args: ['--no-warnings', ...args],
        input: inputStr,
        timeout,
        runId: `${Date.now()}-${Math.random()}`,
      },
      env: { ...process.env },
    });

    const timer = setTimeout(() => {
      worker.terminate().finally(() => {
        log(`ERROR running ${agentPath}: timed out after ${timeout / 1000}s`);
        resolve(null);
      });
    }, timeout + 1000);

    worker.once('message', (result) => {
      clearTimeout(timer);

      if (result.stderr) {
        for (const line of result.stderr.split('\n').filter(Boolean)) {
          log(`  [${agentPath}] ${line}`);
        }
      }

      const trimmed = result.stdout?.trim();
      if (!result.ok) {
        log(`ERROR running ${agentPath}: exit code ${result.code}`);
        if (trimmed) log(`  stdout: ${trimmed.slice(0, 500)}`);
      }

      if (!trimmed) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(trimmed));
      } catch {
        resolve(trimmed);
      }
    });

    worker.once('error', (err) => {
      clearTimeout(timer);
      log(`ERROR running ${agentPath}: ${err.message}`);
      resolve(null);
    });

    worker.once('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timer);
      }
    });
  });
}

// ── Pipeline stages ──────────────────────────────────────────────────────

async function stageResearch(opts) {
  logStep('1/3', 'RESEARCH PIPELINE');

  // 1a. Source monitoring
  log('Scanning sources...');
  const scanArgs = opts.source ? ['--source', opts.source] : [];
  const discovered = await runAgent('agents/source-monitor.mjs', scanArgs);

  if (!discovered || discovered.length === 0) {
    log('No new items discovered from sources.');
    return null;
  }
  log(`Discovered ${discovered.length} items from sources.`);

  // 1b. Topic detection & clustering
  log('Detecting and clustering topics...');
  const topics = await runAgent('agents/topic-detector.mjs', ['--stdin'], discovered);

  // topic-detector returns a bare array, not { clusters: [...] }
  const clusters = Array.isArray(topics) ? topics : topics?.clusters;
  if (!clusters || clusters.length === 0) {
    log('No topic clusters identified.');
    return null;
  }
  log(`Identified ${clusters.length} topic clusters.`);

  // 1c. Compile research dossier for top topic
  const topTopic = clusters[0];
  log(`Compiling research dossier for top topic: "${topTopic.representativeTitle || topTopic.label || topTopic.topic}"...`);
  const dossier = await runAgent('agents/research-compiler.mjs', ['--stdin'], [topTopic]);

  if (!dossier || Array.isArray(dossier)) {
    log('Failed to compile research dossier.');
    return null;
  }

  // Save dossier
  const timestamp = new Date().toISOString().slice(0, 10);
  const slug = (topTopic.representativeTitle || topTopic.label || topTopic.topic || 'unknown')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const dossierPath = join(__dirname, `output/research/dossier-${timestamp}-${slug}.json`);
  await mkdir(dirname(dossierPath), { recursive: true });
  await writeFile(dossierPath, JSON.stringify(dossier, null, 2));
  log(`Research dossier saved: ${dossierPath}`);

  return { dossier, dossierPath, clusters };
}

async function stageDraft(opts, dossier) {
  logStep('2/3', 'AI WRITING SYSTEM');

  if (!dossier && opts.dossier) {
    const raw = await readFile(resolvePath(opts.dossier), 'utf-8');
    dossier = JSON.parse(raw);
  }

  if (!dossier) {
    log('No research dossier available. Cannot generate draft.');
    return null;
  }

  // Determine article type — map research-compiler types to draft-generator types
  let articleType = opts.articleType;
  if (!articleType) {
    articleType = dossier.suggestedArticleType || dossier.suggestedArticleTypes?.[0]?.type;
  }
  articleType = articleType || 'policy-update';
  const contentType = opts.type || 'post';
  log(`Generating ${contentType} draft (type: ${articleType})...`);

  // 2a. Generate draft (5 min timeout — OpenAI API calls can be slow)
  const draft = await runAgent('agents/draft-generator.mjs', [
    '--type', contentType,
    '--article-type', articleType,
    '--stdin',
  ], dossier, { timeout: 300_000 });

  if (!draft) {
    log('Draft generation failed.');
    return null;
  }

  // 2b. Generate title alternatives (5 min timeout for OpenAI)
  // title-generator auto-detects type from input.body, so pass the draft
  // directly (with dossier attached) so it sees body/section/category
  log('Generating title alternatives...');
  const titles = await runAgent('agents/title-generator.mjs', ['--stdin'], draft, { timeout: 300_000 });

  if (titles?.titles?.length) {
    log(`Generated ${titles.titles.length} title options.`);
    draft._titleAlternatives = titles.titles;
  }

  // 2c. Generate/refine summaries (5 min timeout for OpenAI)
  log('Generating summaries...');
  const summaries = await runAgent('agents/summary-generator.mjs', ['--stdin'], draft, { timeout: 300_000 });

  if (summaries) {
    if (summaries.excerpt) draft.excerpt = summaries.excerpt;
    if (summaries.summary) draft.summary = summaries.summary;
    draft._sectionSummaries = summaries.sectionSummaries;
  }

  // 2d. Generate hero image with Gemini when configured
  log('Generating hero image...');
  const heroImageResult = await runAgent('agents/hero-image-generator.mjs', ['--stdin'], draft, { timeout: 300_000 });
  if (heroImageResult?.heroImage) {
    draft.heroImage = heroImageResult.heroImage;
    draft._heroImageGenerated = Boolean(heroImageResult.generated);
    log(`Hero image ready: ${draft.heroImage}`);
  } else {
    log('Hero image generation skipped or failed; keeping existing heroImage path.');
  }

  // Save draft
  const draftId = String(draft.id || Date.now()).padStart(3, '0');
  const draftPath = join(__dirname, `output/drafts/draft-${draftId}.json`);
  await mkdir(dirname(draftPath), { recursive: true });
  await writeFile(draftPath, JSON.stringify(draft, null, 2));
  log(`Draft saved: ${draftPath}`);

  return { draft, draftPath };
}

async function stageQA(opts, draft) {
  logStep('3/3', 'QA / VERIFICATION LAYER');

  if (!draft && opts.draft) {
    const raw = await readFile(resolvePath(opts.draft), 'utf-8');
    draft = JSON.parse(raw);
  }

  if (!draft) {
    log('No draft available. Cannot run QA.');
    return null;
  }

  // Run all QA checks in parallel (5 min timeout — some use OpenAI)
  log('Running QA checks in parallel...');
  const qaTimeout = { timeout: 300_000 };
  const [citationReport, claimReport, legalReport, consistencyReport] = await Promise.all([
    runAgent('agents/citation-checker.mjs', ['--stdin'], draft, qaTimeout),
    runAgent('agents/claim-validator.mjs', ['--stdin'], draft, qaTimeout),
    runAgent('agents/legal-language-checker.mjs', ['--stdin'], draft, qaTimeout),
    runAgent('agents/consistency-checker.mjs', ['--stdin'], draft, qaTimeout),
  ]);

  const qaResults = {
    citations: citationReport,
    claims: claimReport,
    legal: legalReport,
    consistency: consistencyReport,
  };

  // Log individual results
  if (citationReport?.summary) log(`Citations: ${citationReport.summary.verified || 0} verified, ${citationReport.summary.flagged || 0} flagged`);
  if (claimReport?.summary) log(`Claims: ${claimReport.summary.totalClaimsAnalyzed || 0} analyzed, ${claimReport.summary.suspicious || 0} suspicious`);
  if (legalReport?.summary) log(`Legal: ${legalReport.summary.totalFindings || 0} findings`);
  if (consistencyReport?.summary) log(`Consistency: ${consistencyReport.summary.warnings || 0} warnings`);

  // Run quality scorer with all reports
  log('Calculating quality score...');
  const scorerResult = await runAgent('agents/quality-scorer.mjs', ['--stdin'], {
    article: draft,
    reports: {
      citation: qaResults.citations,
      claim: qaResults.claims,
      legal: qaResults.legal,
      consistency: qaResults.consistency,
    },
  }, { timeout: 300_000 });

  // quality-scorer wraps the scorecard inside { agent, scorecard, ... }
  const scorecard = scorerResult?.scorecard || scorerResult;

  if (scorecard) {
    log(`\nQUALITY SCORE: ${scorecard.overallScore}/100`);
    log(`PUBLISH READINESS: ${scorecard.publishReadiness}`);

    if (scorecard.requiredRevisions?.length) {
      log('\nRequired revisions:');
      for (const rev of scorecard.requiredRevisions) {
        log(`  - [${rev.priority || rev.severity}] ${rev.issue || rev.description} (${rev.category || ''})`);
      }
    }
  }

  // Save QA report — use same zero-padded ID format as draft filenames
  const reportId = String(draft.id || Date.now()).padStart(3, '0');
  const reportPath = join(__dirname, `output/qa-reports/qa-${reportId}.json`);
  await mkdir(dirname(reportPath), { recursive: true });
  const fullReport = { ...qaResults, scorerResult, scorecard, draft: { id: draft.id, title: draft.title } };
  await writeFile(reportPath, JSON.stringify(fullReport, null, 2));
  log(`QA report saved: ${reportPath}`);

  return { qaResults, scorecard, reportPath };
}

// ── Pipeline modes ───────────────────────────────────────────────────────

async function runFull(opts) {
  log('Running FULL pipeline: Research -> Draft -> QA\n');

  const research = await stageResearch(opts);
  if (!research) {
    log('\nPipeline stopped: no research results.');
    return;
  }

  const draftResult = await stageDraft(opts, research.dossier);
  if (!draftResult) {
    log('\nPipeline stopped: draft generation failed.');
    return;
  }

  const qa = await stageQA(opts, draftResult.draft);

  // Final summary
  logStep('DONE', 'PIPELINE COMPLETE');
  log(`Research dossier: ${research.dossierPath}`);
  log(`Draft:            ${draftResult.draftPath}`);
  log(`QA report:        ${qa?.reportPath || 'N/A'}`);
  log(`Quality score:    ${qa?.scorecard?.overallScore || 'N/A'}/100`);
  log(`Publish status:   ${qa?.scorecard?.publishReadiness || 'N/A'}`);

  if (qa?.scorecard?.publishReadiness === 'READY') {
    log('\nDraft is ready for editorial review.');
    log('To publish, copy the draft JSON to posts/ or update public/news.json');
  } else {
    log('\nDraft needs revision before publishing.');
    log(`See QA report for details: ${qa?.reportPath}`);
  }

  // Output final result as JSON to stdout
  console.log(JSON.stringify({
    status: 'complete',
    dossierPath: research.dossierPath,
    draftPath: draftResult.draftPath,
    qaReportPath: qa?.reportPath,
    qualityScore: qa?.scorecard?.overallScore,
    publishReadiness: qa?.scorecard?.publishReadiness,
  }, null, 2));
}

async function runResearchOnly(opts) {
  log('Running RESEARCH-ONLY pipeline\n');
  const research = await stageResearch(opts);

  if (research) {
    console.log(JSON.stringify({
      status: 'complete',
      dossierPath: research.dossierPath,
      topicCount: research.clusters?.length || 0,
    }, null, 2));
  }
}

async function runDraftOnly(opts) {
  log('Running DRAFT mode\n');

  if (!opts.dossier) {
    log('ERROR: --dossier path required for draft mode');
    process.exit(1);
  }

  const draftResult = await stageDraft(opts, null);
  if (draftResult) {
    console.log(JSON.stringify({
      status: 'complete',
      draftPath: draftResult.draftPath,
    }, null, 2));
  }
}

async function runQAOnly(opts) {
  log('Running QA mode\n');

  if (!opts.draft) {
    log('ERROR: --draft path required for qa mode');
    process.exit(1);
  }

  const qa = await stageQA(opts, null);
  if (qa) {
    console.log(JSON.stringify({
      status: 'complete',
      qaReportPath: qa.reportPath,
      qualityScore: qa.scorecard?.overallScore,
      publishReadiness: qa.scorecard?.publishReadiness,
    }, null, 2));
  }
}

async function runSingle(opts) {
  if (!opts.topic) {
    log('ERROR: --topic required for single mode');
    process.exit(1);
  }

  log(`Running SINGLE-TOPIC pipeline for: "${opts.topic}"\n`);

  // Create a synthetic dossier from the topic string
  logStep('1/3', 'RESEARCH COMPILATION');
  log(`Compiling research for topic: "${opts.topic}"...`);

  const dossier = await runAgent('agents/research-compiler.mjs', [
    '--topic', opts.topic,
  ]);

  if (!dossier) {
    log('Failed to compile research. Trying with minimal dossier...');
  }

  const effectiveDossier = dossier || {
    topic: opts.topic,
    summary: opts.topic,
    sources: [],
    facts: [],
    suggestedArticleType: opts.articleType || 'explainer',
  };

  // Draft
  const draftResult = await stageDraft(opts, effectiveDossier);
  if (!draftResult) {
    log('\nPipeline stopped: draft generation failed.');
    return;
  }

  // QA
  const qa = await stageQA(opts, draftResult.draft);

  logStep('DONE', 'SINGLE-TOPIC PIPELINE COMPLETE');
  log(`Draft:          ${draftResult.draftPath}`);
  log(`QA report:      ${qa?.reportPath || 'N/A'}`);
  log(`Quality score:  ${qa?.scorecard?.overallScore || 'N/A'}/100`);
  log(`Publish status: ${qa?.scorecard?.publishReadiness || 'N/A'}`);

  console.log(JSON.stringify({
    status: 'complete',
    draftPath: draftResult.draftPath,
    qaReportPath: qa?.reportPath,
    qualityScore: qa?.scorecard?.overallScore,
    publishReadiness: qa?.scorecard?.publishReadiness,
  }, null, 2));
}

async function runScan(opts) {
  log('Running SOURCE SCAN\n');
  const scanArgs = opts.source ? ['--source', opts.source] : [];
  const discovered = await runAgent('agents/source-monitor.mjs', scanArgs);

  if (discovered) {
    log(`Discovered ${discovered.length} items.`);
    console.log(JSON.stringify(discovered, null, 2));
  }
}

async function runReview(opts) {
  log('Running REVIEW of all pending drafts\n');

  const draftsDir = join(__dirname, 'output/drafts');
  let files;
  try {
    files = await readdir(draftsDir);
  } catch {
    log('No drafts directory found.');
    return;
  }

  const draftFiles = files.filter(f => f.endsWith('.json'));
  if (draftFiles.length === 0) {
    log('No drafts to review.');
    return;
  }

  const results = [];
  for (const file of draftFiles) {
    log(`\nReviewing ${file}...`);
    const draftPath = join(draftsDir, file);
    const draft = JSON.parse(await readFile(draftPath, 'utf-8'));
    const qa = await stageQA({ ...opts, draft: null }, draft);
    results.push({
      file,
      title: draft.title,
      score: qa?.scorecard?.overallScore,
      status: qa?.scorecard?.publishReadiness,
    });
  }

  logStep('DONE', 'REVIEW COMPLETE');
  for (const r of results) {
    log(`${r.status?.padEnd(15)} ${String(r.score).padStart(3)}/100  ${r.title}`);
  }

  console.log(JSON.stringify(results, null, 2));
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  // Ensure output directories exist
  await mkdir(join(__dirname, 'output/research'), { recursive: true });
  await mkdir(join(__dirname, 'output/drafts'), { recursive: true });
  await mkdir(join(__dirname, 'output/qa-reports'), { recursive: true });

  if (opts.dryRun) {
    log(`DRY RUN - Mode: ${opts.mode}`);
    log(`Would run pipeline with options: ${JSON.stringify(opts, null, 2)}`);
    return;
  }

  switch (opts.mode) {
    case 'full':          await runFull(opts); break;
    case 'research-only': await runResearchOnly(opts); break;
    case 'draft':         await runDraftOnly(opts); break;
    case 'qa':            await runQAOnly(opts); break;
    case 'single':        await runSingle(opts); break;
    case 'scan':          await runScan(opts); break;
    case 'review':        await runReview(opts); break;
    default:
      log(`Unknown mode: ${opts.mode}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  log(`Fatal error: ${err.message}`);
  process.stderr.write(err.stack + '\n');
  process.exit(1);
});
