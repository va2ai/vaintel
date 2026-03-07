#!/usr/bin/env node
/**
 * Assembles individual JSON files from posts/ and guides/ into
 * public/posts.json, public/guides.json (+ dist copies).
 *
 * Runs automatically as part of the Vite build (see vite.config.js plugin).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function buildCollection(dirName, sortFn, label) {
  const dir = path.join(ROOT, dirName);
  const pubOut = path.join(ROOT, "public", `${dirName}.json`);
  const distOut = path.join(ROOT, "dist", `${dirName}.json`);

  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  const items = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")));
  if (sortFn) items.sort(sortFn);

  const json = JSON.stringify(items, null, 2) + "\n";
  fs.writeFileSync(pubOut, json);
  console.log(`[build] Wrote ${items.length} ${label} to public/${dirName}.json`);

  if (fs.existsSync(path.dirname(distOut))) {
    fs.writeFileSync(distOut, json);
    console.log(`[build] Synced to dist/${dirName}.json`);
  }
  return items.length;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function buildReviewQueue() {
  const draftsDir = path.join(ROOT, "scripts", "content-pipeline", "output", "drafts");
  const qaDir = path.join(ROOT, "scripts", "content-pipeline", "output", "qa-reports");
  const pubOut = path.join(ROOT, "public", "review-queue.json");
  const distOut = path.join(ROOT, "dist", "review-queue.json");

  const draftFiles = fs.existsSync(draftsDir)
    ? fs.readdirSync(draftsDir).filter((f) => f.endsWith(".json"))
    : [];
  const qaFiles = fs.existsSync(qaDir)
    ? fs.readdirSync(qaDir).filter((f) => f.endsWith(".json"))
    : [];

  const qaReports = qaFiles
    .map((file) => {
      const fullPath = path.join(qaDir, file);
      const data = readJsonIfExists(fullPath);
      if (!data) return null;
      const stat = fs.statSync(fullPath);
      return { file, fullPath, stat, data };
    })
    .filter(Boolean);

  const queue = draftFiles
    .map((file) => {
      const fullPath = path.join(draftsDir, file);
      const draft = readJsonIfExists(fullPath);
      if (!draft) return null;

      const stat = fs.statSync(fullPath);
      const draftId = String(draft.id ?? "");
      const exactQaFile = `qa-${draftId.padStart(3, "0")}.json`;
      const matchingReports = qaReports
        .filter((report) => {
          const reportDraftId = String(report.data?.draft?.id ?? report.data?.article?.id ?? report.data?.scorerResult?.article?.id ?? "");
          return report.file === exactQaFile || (reportDraftId && reportDraftId === draftId);
        })
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

      const qa = matchingReports[0]?.data || null;
      const scorecard = qa?.scorecard || qa?.scorerResult?.scorecard || null;

      return {
        id: draftId || path.basename(file, ".json"),
        draftPath: fullPath,
        draftFile: file,
        kind: typeof draft.id === "string" && draft.id.startsWith("n") ? "news" : "post",
        title: draft.title || "Untitled Draft",
        category: draft.category || null,
        section: draft.section || null,
        date: draft.date || null,
        excerpt: draft.excerpt || null,
        summary: draft.summary || null,
        readTime: draft.readTime || null,
        createdAt: stat.mtime.toISOString(),
        titleAlternatives: draft._titleAlternatives || [],
        sectionSummaries: draft._sectionSummaries || [],
        draft,
        qa,
        scorecard,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const scoreDiff = (b.scorecard?.overallScore || -1) - (a.scorecard?.overallScore || -1);
      if (scoreDiff !== 0) return scoreDiff;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

  const json = JSON.stringify(queue, null, 2) + "\n";
  fs.writeFileSync(pubOut, json);
  console.log(`[build] Wrote ${queue.length} pipeline review items to public/review-queue.json`);

  if (fs.existsSync(path.dirname(distOut))) {
    fs.writeFileSync(distOut, json);
    console.log("[build] Synced to dist/review-queue.json");
  }
}

buildCollection("posts", (a, b) => b.id - a.id, "posts");
buildCollection("guides", null, "guides");
buildReviewQueue();
