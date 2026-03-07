# V2 Roadmap Matrix

This file translates [LONG_TERM_GOALS.md](/Users/ccdmn/code/researcher/opai/site/LONG_TERM_GOALS.md) into an execution-oriented matrix.

Use it to decide:

- what is already good enough to package now
- what needs refinement before launch
- what must be built new
- what should wait

Current source-of-truth docs:

- [LONG_TERM_GOALS.md](/Users/ccdmn/code/researcher/opai/site/LONG_TERM_GOALS.md)
- [BRAND_LANGUAGE_AND_NAV.md](/Users/ccdmn/code/researcher/opai/site/BRAND_LANGUAGE_AND_NAV.md)
- [PRODUCT_CATALOG.md](/Users/ccdmn/code/researcher/opai/site/PRODUCT_CATALOG.md)

## Status Definitions

### Already Built

Core capability exists and is usable now, even if it needs better packaging.

### Needs Refinement

The capability exists but needs UX, naming, QA, or integration work before it should be a core part of the product story.

### New Build

This is strategically important and does not yet exist in a usable product form.

### Nice Later

Valuable, but should not block current consolidation, publication, or monetization work.

## Roadmap Matrix

| Area | Already Built | Needs Refinement | New Build | Nice Later |
|---|---|---|---|---|
| Brand consolidation | Multiple surfaces already exist: research app, content site, landing pages, admin, freemium variants. Canonical brand language is now defined around "VA claims intelligence" in `BRAND_LANGUAGE_AND_NAV.md`. | Shared CTA language across all surfaces, consistent subheads, product naming cleanup, design-system consistency | Deeper master messaging framework for every landing page and product page | Full codebase consolidation if separate services remain workable |
| Information architecture | Site pages, tool surfaces, multiple entry points already exist. Official current nav is now defined and implemented as Home / Policy / Claims Strategy / Case Analysis / Decision Search / Tools. | Tab sprawl reduction, route clarity, mapping features into public/free/pro/internal buckets, footer and secondary-nav consistency | Canonical sitemap across all product surfaces, product map for free/pro/professional | Advanced personalization of nav by audience |
| Publication system | Content site, guides, posts, news, admin CRUD, markdown editing, images, Firestore-backed content | Editorial taxonomy cleanup, better templates, stronger article metadata, internal linking, topic hubs | Editorial standards page, methodology page, AI use policy, author system, newsletter archive | Multi-author CMS workflows and contributor management |
| Research core | Multi-agent orchestration, retrieval stack, streaming UX, synthesis modes, research graph, knowledge-base direction, observability | Internal naming cleanup so this reads as one "Research Core" instead of many demos | Unified internal research packet schema for downstream editorial and premium tools | Additional agent complexity beyond current proven workflows |
| Research-to-publishing pipeline | Research sessions, structured outputs, citations, synthesis, case/reg retrieval | Output normalization for editorial use, source bundling, better article-ready summaries | "Create Article From Research" flow, research packet to draft pipeline, editor approval queue | Fully automated no-human publishing |
| Editorial style system | Prompt infrastructure, role-based agents, structured synthesis | Tone consistency, headline quality, citation formatting, risk phrasing | Master style guide config, article-type rules, CTA rules, audience-specific variants | More granular per-author style emulation |
| Publish QA and verification | Citations, source retrieval, observability, structured outputs, legal source coverage | Basic validation layers, publish review ergonomics, confidence framing | Publish QA scorecard, unsupported-claim detector, citation validation, date verification, privacy/PII checks, legal-advice risk checks | Heavier automatic fact-checking across broader web/news ecosystems |
| Free public tools | BVA search, CFR lookup, KnowVA search, CAVC exploration direction, Nexus Scout direction, content explainers | Rename tools around user jobs-to-be-done, simplify cards and entry points, improve descriptions | Tool catalog page with clear free/public positioning | More utility tools beyond the core set |
| Premium tools | Claim research workflows, CAVC deep dive, attorney pipeline direction, richer synthesis modes | Product packaging, pricing boundaries, value communication, upgrade prompts | Formal premium catalog, metering, saved research, export/report layers | Advanced workspace features before core monetization is proven |
| Decision Deconstructor | Important backend ingredients already exist: document analysis direction, structured synthesis, claim workflows | Some plumbing likely exists but not as a single clean hero workflow | Dedicated upload-to-analysis product flow, favorable findings extraction, denial basis mapping, next-step strategy output | Secondary analysis products before this flagship is launched |
| Audience segmentation | Attorney-specific and veteran-oriented surface directions already exist | Messaging by audience, clearer paths for veterans vs VSOs vs attorneys, CTA targeting | Official audience tracks and audience-specific landing/product pages | Dynamic account-based tailoring by organization type |
| Monetization | Freemium direction, separate tool ideas, audience split already exist | Cleaner packaging and fewer partial concepts, clearer upgrade paths | Free / Pro / Professional pricing model, entitlement boundaries, usage limits, export gating | Team billing, seats, collaborative workspaces |
| Newsletter and distribution | Publication can already support newsletter calls-to-action and content cadence | Better placement, archive visibility, stronger subscriber journey | Daily/weekly digest pipeline, topic-based editorial distribution, publication-driven retention loop | Sophisticated lifecycle automation and CRM segmentation |
| Automation control center | Observability, task flows, orchestration, session state, knowledge layers already exist | Need to unify them around editorial operations rather than leaving them as backend capabilities | Source watchlists, story queue, draft queue, QA queue, scheduled briefs, publish calendar | Full newsroom-scale planning and staffing abstractions |
| Admin and internal ops | Admin editing surfaces exist for posts, guides, and news | Better workflow visibility, review states, editorial queueing, publish states | Internal workflow console for draft review, QA approval, publish scheduling | Deep role/permission modeling for larger teams |

## Highest-Leverage Sequence

## 1. Clarify

Status:

- Brand language: completed
- Official nav: completed
- Product catalog: completed

Do next:

- define editorial taxonomy
- define the product story in one sentence and one homepage structure

Avoid:

- building new tools before naming and packaging the existing ones

## 2. Unify

Do next:

- unify homepage messaging
- unify site and app CTA paths
- unify design language
- cross-link content and tools correctly
- reduce route and tab sprawl

Avoid:

- launching more disconnected surfaces

## 3. Operationalize

Do next:

- create research packet format
- create style guide system
- create draft -> QA -> editor workflow
- create publish queue

Avoid:

- fully automated publishing without strong review gates

## 4. Productize

Do next:

- package public tools
- package premium tools
- launch Decision Deconstructor
- define pricing and usage boundaries

Avoid:

- overbuilding team features before solo user monetization is clear

## 5. Scale

Do later:

- daily brief
- weekly digest
- story detection automation
- professional workflow expansion
- team collaboration features

## Recommended Near-Term Priority Stack

### Priority 1

- Editorial taxonomy and templates
- Tool catalog UI and pricing-page packaging
- pricing and upgrade-path presentation

### Priority 2

- Research packet -> article workflow
- Editorial style guide engine
- Publish QA scorecard

### Priority 3

- Tool catalog packaging
- Free/pro/professional monetization boundaries
- Decision Deconstructor launch

### Priority 4

- Newsletter and digest automation
- Editorial operations console

## What To Ship Before New Architecture Work

Before doing major backend reinvention, ship:

- one unified product story
- one official navigation model
- one cleaned-up publication structure
- one research-to-article workflow
- one QA gate for publishable output
- one clear free/pro/professional pricing ladder
- one flagship premium wedge: Decision Deconstructor

## Decision Filter For New Work

Use this filter before starting anything new.

### Green-light work if it:

- reduces fragmentation
- improves trust
- improves conversion
- strengthens recurring usage
- improves product clarity
- deepens a real moat

### Delay work if it:

- duplicates an existing capability
- only showcases technical sophistication
- adds another disconnected UI surface
- creates more naming confusion
- expands architecture before packaging is solved

## Suggested Immediate Build Queue

### Build now

- formalize editorial taxonomy and templates
- reflect the locked catalog in UI, pricing, and upgrade paths
- create research packets as a durable intermediate artifact
- build a style guide config for AI-assisted output
- build a publish QA scorecard
- launch Decision Deconstructor as the first flagship product

### Build after that

- newsletter archive and digest automation
- topic watchlists and candidate story queue
- editorial scheduling and internal ops console

### Build later

- team workspaces
- collaborative matter management
- advanced enterprise workflows

## Main Takeaway

## Current Locked Decisions

These should be treated as current defaults unless intentionally revised.

### Category language

- V2 category: `VA claims intelligence`
- Primary homepage headline: `VA Claims Intelligence`
- Core description: `Independent reporting and claims intelligence for VA disability claims and appeals.`

### Official nav

- `Home` -> `/`
- `Policy` -> `/section/va-policy`
- `Claims Strategy` -> `/section/claims-strategy`
- `Case Analysis` -> `/section/cavc`
- `Decision Search` -> `/bva`
- `Tools` -> `/tools`

### CTA defaults

- `Start Research`
- `Explore Tools`
- `Read Latest`
- `Get the Weekly Brief`

### Official tier model

- `Free`
- `Pro`
- `Professional`

### Catalog anchors

Free:

- `Publication`
- `BVA Decision Search`
- `38 CFR Navigator`
- `KnowVA / M21-1 Search`
- `VA Math Calculator`
- `CAVC Precedent Library`
- `Nexus Scout Lite`

Pro:

- `Claim Research Assistant`
- `Nexus Scout Pro`
- `CAVC Case Analyzer`

Professional:

- `Decision Deconstructor`
- `Appeal Strategy Workbench`
- `Attorney Research Mode`

### Architecture anchors

- `Decision Deconstructor`
- `Interpretive Engine`
- `Secondary Mapper`
- `Nexus Scorer`
- `Terminology & Framing Engine`

The current phase is not:

- invent more backend complexity

The current phase is:

- consolidate
- rename
- package
- publish
- monetize

V2 already has substantial technical depth.

The highest-value work now is converting that depth into a coherent product stack with a clear publication layer, a clear tool catalog, and a clear flagship wedge.
