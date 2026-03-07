#!/usr/bin/env node
/**
 * Assembles individual JSON files from posts/ and guides/ into
 * public/posts.json, public/guides.json (+ dist copies).
 *
 * Runs automatically as part of the Vite build (see vite.config.js plugin).
 */
const fs = require("fs");
const path = require("path");

function buildCollection(dirName, sortFn, label) {
  const dir = path.join(__dirname, dirName);
  const pubOut = path.join(__dirname, "public", `${dirName}.json`);
  const distOut = path.join(__dirname, "dist", `${dirName}.json`);

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

buildCollection("posts", (a, b) => b.id - a.id, "posts");
buildCollection("guides", null, "guides");
