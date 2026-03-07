/**
 * Optimize images in public/images/ -> convert PNGs to WebP, resize to max 1200px wide.
 * Runs as part of the build pipeline. Originals are preserved, WebP versions are added.
 * The site JSX references .png files; we generate .webp alongside and use <picture> or
 * just swap extensions in the component if desired. For now, we overwrite the PNGs with
 * optimized smaller PNGs and also create WebP versions.
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const IMG_DIR = path.join(__dirname, "..", "public", "images");
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;
const PNG_QUALITY = 80; // pngquant-style quality not available in sharp, but we can use compression level

async function optimizeDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await optimizeDir(fullPath);
      continue;
    }
    if (!/\.(png|jpg|jpeg)$/i.test(entry.name)) continue;
    if (entry.name.endsWith(".webp")) continue;

    const stats = fs.statSync(fullPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

    try {
      const img = sharp(fullPath);
      const meta = await img.metadata();

      // Resize if wider than MAX_WIDTH
      const pipeline = meta.width > MAX_WIDTH
        ? img.resize(MAX_WIDTH, null, { withoutEnlargement: true })
        : img;

      // Overwrite original with optimized version
      const ext = path.extname(entry.name).toLowerCase();
      let buf;
      if (ext === ".png") {
        buf = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
      } else {
        buf = await pipeline.jpeg({ quality: PNG_QUALITY, mozjpeg: true }).toBuffer();
      }
      fs.writeFileSync(fullPath, buf);

      // Also create WebP
      const webpPath = fullPath.replace(/\.(png|jpg|jpeg)$/i, ".webp");
      const webpBuf = await sharp(fullPath)
        .resize(MAX_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      fs.writeFileSync(webpPath, webpBuf);

      const newSize = (buf.length / (1024 * 1024)).toFixed(1);
      const webpSize = (webpBuf.length / 1024).toFixed(0);
      console.log(`[img] ${entry.name}: ${sizeMB}MB -> ${newSize}MB (png) / ${webpSize}KB (webp)`);
    } catch (e) {
      console.warn(`[img] SKIP ${entry.name}: ${e.message}`);
    }
  }
}

optimizeDir(IMG_DIR).then(() => console.log("[img] Done."));
