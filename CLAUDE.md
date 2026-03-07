# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Veteran2Veteran (V2V) — a VA disability claims intelligence site for veterans. Provides articles, guides, news, AI-powered tools (BVA case search, Nexus Scout, VA Math Calculator), and a chat interface.

## Commands

```bash
npm run dev      # Start Vite dev server (auto-runs build-posts.cjs on guide/post changes)
npm run build    # optimize-images.cjs + vite build (also runs build-posts.cjs via plugin)
npm run preview  # Preview production build locally
```

No test runner or linter is configured.

## Architecture

**Routing:** `src/main.jsx` defines top-level routes via React Router:
- `/bva` → `BvaSearch.jsx` (standalone page)
- `/nexus-scout` → `NexusScout.jsx` (standalone page)
- `/admin` → `Admin.jsx` (standalone page)
- `/pricing` → `PricingPage.jsx` (standalone page)
- `/*` → `veteran2veteran-site.jsx` (main site, handles sub-routing internally)

**Main site routing** (`veteran2veteran-site.jsx`): Uses `useLocation()` to match `/article/:id`, `/guide/:id`, `/section/:slug`, `/tools`, and `/` — all rendered within `<Layout>`. This is a single component that manages all homepage, article, guide, section, and news views via state.

**Data loading:** Content loads from Firestore first (`src/firestore.js`), falling back to static JSON files (`public/posts.json`, `public/guides.json`, `public/news.json`). The `scripts/build-posts.cjs` script assembles individual JSON files from `posts/` and `guides/` directories into these public JSON files. It runs automatically via a Vite plugin on dev server start and on file changes.

**Firebase:** Config uses `VITE_FIREBASE_*` env vars (see `.github/workflows/deploy.yml` for the full list). `src/firebase.js` uses lazy initialization. Firestore collections: `posts`, `articles`, `guides`, `news`, `subscribers`.

**Image pipeline:** `scripts/optimize-images.cjs` runs before Vite build — resizes PNGs/JPGs to max 1200px, creates WebP versions alongside originals in `public/images/`.

**Hero images:** Python scripts in `scripts/` (`gen-hero.py`, `gen-guide-heroes.py`, `gen-post-heroes.py`, `gen-resource-heroes.py`).

**Styling:** Single main stylesheet at `src/styles/publication.css`. Uses CSS custom properties (`--navy-900`, `--gold-500`, `--serif`, `--sans`, etc.).

**Content model:**
- Posts/news have `id`, `title`, `category`, `tags`, `section`, `body`, `summary`, `featured`, `isFeaturedHero`
- Guides have `id`, `title`, `sections[]` (each with `heading` + `content` in markdown)
- Posts now have explicit `section` field. `SECTION_MAP` in `veteran2veteran-site.jsx` provides fallback mapping from categories/tags to editorial sections: `va-policy`, `claims-strategy`, `cavc`, `explainers`, `opinion`

**Chat:** `Chat.jsx` provides a contextual AI chat widget. Takes `contextTitle`, `contextType`, and `contextText` props. Backend proxied via Vite to `https://vet-research-524576132881.us-central1.run.app/api`.

## Project Structure

```
src/                 # React app source
scripts/             # Build & image generation scripts
docs/                # Planning docs, reports, roadmaps
guides/              # Guide content (JSON)
posts/               # Blog posts (JSON)
public/              # Static assets
```

## Deployment

Push to `main` triggers GitHub Actions → builds → deploys to Firebase Hosting (project: `vaclaims-194006`). Firebase config requires secrets: `FIREBASE_SERVICE_ACCOUNT`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`.

## Key Conventions

- Content uses markdown (rendered via `marked` + `DOMPurify`)
- Build scripts are CommonJS (`.cjs`) since the project is `"type": "module"`
- Scripts and docs have been moved to `scripts/` and `docs/` directories
- `veteran2veteran-site.jsx` lives in `src/` (the main site component)
- Product tiers: Free / Pro / Professional (see `docs/PRODUCT_CATALOG.md`)
- Brand language and nav spec: `docs/BRAND_LANGUAGE_AND_NAV.md`
