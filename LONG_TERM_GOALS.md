# V2 Long-Term Goals

Companion docs:

- [BRAND_LANGUAGE_AND_NAV.md](/Users/ccdmn/code/researcher/opai/site/BRAND_LANGUAGE_AND_NAV.md)
- [PRODUCT_CATALOG.md](/Users/ccdmn/code/researcher/opai/site/PRODUCT_CATALOG.md)
- [ROADMAP_MATRIX.md](/Users/ccdmn/code/researcher/opai/site/ROADMAP_MATRIX.md)

Architecture reference:

- `C:\Users\ccdmn\Downloads\V2V_Agentic_Platform_Architecture.pdf`

## Core Shift

V2 is not starting from zero. The hardest technical layer already exists:

- a serious research backbone
- multi-agent orchestration
- streaming UX
- domain retrieval across BVA, CFR, KnowVA, and CAVC
- a separate content site
- admin and editorial surfaces
- multiple audience-specific landing pages

The strategic shift is:

From:

- build the platform

To:

- productize what exists
- unify the product story
- publish consistently
- package clear offerings
- monetize with trust

This means the main remaining work is not core AI engineering. The main remaining work is:

- brand unification
- editorial systemization
- research-to-publication workflows
- product packaging
- monetization gates
- trust and conversion systems

## Product Thesis

V2 should become a VA claims intelligence platform that combines:

- an authoritative publication
- free public research tools
- premium claim-analysis workflows
- internal editorial and research automation

The architecture PDF sharpens this further:

- V2 is a claims-intelligence layer, not just a generic AI app
- the strongest wedge products are module-driven, especially Decision Deconstructor
- the long-term platform should be understandable as a set of connected workflows, not disconnected tools

Suggested positioning:

Veteran 2 Veteran is a VA claims intelligence platform combining independent reporting, legal research tools, and AI-powered claim strategy workflows for veterans, advocates, and attorneys.

Short version:

Independent reporting and claims intelligence for VA disability claims and appeals.

## Locked Strategic Decisions

These are now current defaults, not open questions:

- brand category: `VA claims intelligence`
- official tier model: `Free / Pro / Professional`
- flagship product wedge: `Decision Deconstructor`
- current official nav is defined in `BRAND_LANGUAGE_AND_NAV.md`
- current product packaging is defined in `PRODUCT_CATALOG.md`

## What Already Exists

### Research Core

- multi-agent research orchestration
- structured retrieval across legal and policy sources
- claim and reference synthesis
- streaming product UX
- knowledge-base and theory distillation
- cite and deep-dive workflows
- observability and session state

### Publication Layer

- separate content site
- guides, posts, and news flows
- admin dashboard
- markdown editing
- image upload
- Firestore-backed content management

### Tool Layer

- BVA search
- CFR lookup
- KnowVA / M21-1 search
- CAVC deep dive
- Cite interface
- Nexus Scout
- AI chat / assistant surfaces
- attorney-oriented pipeline

### Module Direction From the Architecture PDF

The platform architecture identifies five module-level wedges:

- Decision Deconstructor
- Interpretive Engine
- Secondary Mapper
- Nexus Scorer
- Terminology & Framing Engine

These should be treated as long-term product architecture anchors, even if the current public packaging uses simpler tool names.

### Market Surface

- multiple landing pages
- audience-specific messaging directions
- freemium / premium product hints

## Strategic Goal

Turn multiple impressive but separate surfaces into one coherent V2 platform.

Users should immediately understand:

- what V2 is
- what is free
- what is premium
- where to start
- why the publication and research tools belong together

## Long-Term Build Sections

## 1. Platform Consolidation

### Goal

Make the ecosystem feel like one platform instead of a collection of strong but separate products.

### Build / refine

- unified brand architecture
- shared navigation and identity across surfaces
- shared design language
- shared analytics
- shared CTA strategy
- cross-linking between content and tools
- consistent "claims intelligence" language across surfaces
- consistent free/pro/professional pathways

### Outcome

V2 reads as one coherent company and one coherent product stack.

## 2. Publication System Productization

### Goal

Turn the content site from a simple content surface into a real VA intelligence publication.

### Build / refine

- formal editorial taxonomy
- article templates by type
- author pages
- editorial standards page
- AI use and sourcing policy
- methodology pages
- internal linking blocks
- topic hub pages
- newsletter archive

### Core editorial categories

- VA Policy
- Claims Strategy
- Case Analysis
- Research & Explainers
- Tools & Guides

### Outcome

The publication becomes the trust, SEO, and authority engine.

## 3. Research-to-Publishing Pipeline

### Goal

Turn the research engine into a story-generation and briefing engine with human approval.

### Build / refine

- Create Article From Research workflow
- research packet schema
- publishable source bundle
- article-type selector
- timeline generation
- "what changed" summaries
- headline and dek suggestions
- structured draft output
- editor review queue
- publish approval gate

### Outcome

The research engine feeds the publication directly.

## 4. Editorial Style Guide Engine

### Goal

Make AI-assisted output sound like V2 instead of generic model output.

### Build / refine

- master editorial style guide in JSON or YAML
- voice rules
- headline conventions
- citation conventions
- "why it matters" block rules
- prohibited phrases
- claim-risk phrasing
- no-legal-advice phrasing
- audience-specific variants
- CTA placement rules

### Audience variants

- veteran-facing
- VSO-facing
- attorney-facing

### Outcome

Automation produces branded assets, not generic content.

## 5. Verification and Publish QA

### Goal

Use existing research rigor to create a publication-grade QA gate.

### Build / refine

- publish QA scorecard
- unsupported-claim detection
- citation completeness checks
- date verification
- regulation and case citation validation
- title/body mismatch detection
- privacy and PII detection
- legal-advice risk detection
- source-confidence labels

### Outcome

Every draft receives a publish-readiness score before release.

## 6. Flagship Public Tools Packaging

### Goal

Repackage existing capabilities into clear product cards and user-facing workflows.

### Public / free tools

- BVA Decision Search
- 38 CFR Navigator
- KnowVA / M21-1 Search
- VA Math Calculator
- CAVC Precedent Library
- Nexus Scout Lite

### Pro tools

- Claim Research Assistant
- CAVC Case Analyzer
- Nexus Scout Pro

### Professional tools

- Decision Deconstructor
- Appeal Strategy Workbench
- Attorney Research Mode

### Outcome

Visitors can understand each tool in seconds and know what is worth paying for.

## 7. Decision Deconstructor as the First Major Wedge

### Goal

Build the first iconic proprietary V2 tool around claim-denial analysis.

### Product flow

Upload VA decision -> extract favorable findings -> identify denial basis -> recommend next-step path

### Outputs

- favorable findings
- missing evidence
- likely filing lane
- issue-by-issue strategy summary
- related BVA, CAVC, and CFR support

### Outcome

Decision Deconstructor becomes the flagship wedge and strongest product story.

## 8. Audience-Specific Product Tracks

### Goal

Stop treating all users as a single segment.

### Veterans

- explainers
- claim guides
- calculators
- lightweight tools
- newsletter

### VSOs / accredited agents

- research workflows
- case search
- pattern finding
- evidence checklists
- saved research

### Attorneys

- appeal tools
- deep-dive workflows
- case clustering
- professional memos
- later team workflows

### Outcome

Messaging and conversion improve because each audience sees the product through its own job-to-be-done.

## 9. Monetization Packaging

### Goal

Create a clear pricing ladder without turning the site into a funnel trap.

### Free

- publication access
- newsletter
- BVA Decision Search
- 38 CFR Navigator
- KnowVA / M21-1 Search
- VA Math Calculator
- CAVC Precedent Library
- Nexus Scout Lite

### Pro

- Claim Research Assistant
- Nexus Scout Pro
- CAVC Case Analyzer
- saved research
- deeper outputs
- exports

### Professional

- Decision Deconstructor
- Appeal Strategy Workbench
- Attorney Research Mode
- advanced decision analysis
- appeal workflows
- higher usage limits

### Team later

- seat billing
- workspaces
- shared folders
- internal notes

### Outcome

V2 has a monetization ladder that matches user intent and product depth.

## 10. Automation Control Center

### Goal

Build the internal newsroom and operations console that manages automated research and editorial production.

### Build / refine

- source watchlists
- topic alerts
- candidate story queue
- dossier generation
- draft queue
- QA queue
- scheduled briefs
- daily or weekly digests
- publish calendar
- performance feedback loop

### Outcome

V2 operates like a domain-intelligence engine, not just a set of tools.

## Product Architecture Model

The right mental model is:

V2 already has the engine. The next step is to build the:

- dashboard
- publication
- storefront
- pricing layer
- editorial operating system

This is a different stage from AI architecture work. The leverage now comes from:

- focus
- packaging
- editorial integration
- monetization

The architecture PDF also suggests a second mental model:

- Decision Deconstructor is the first wedge
- Interpretive Engine and Secondary Mapper expand the research and strategy layer
- Nexus Scorer becomes a trust and QA wedge
- Terminology & Framing shapes top-of-funnel and in-product language

That means productization should happen around modules and workflows, not around generic assistant framing.

## Consolidated Product Structure

```text
V2
├── Publication
│   ├── VA Policy
│   ├── Claims Strategy
│   ├── Case Analysis
│   ├── Research & Explainers
│   └── Newsletter
│
├── Free Research Tools
│   ├── BVA Search
│   ├── CFR Navigator
│   ├── KnowVA Search
│   ├── VA Math Calculator
│   ├── CAVC Precedent Library
│   └── Nexus Scout Lite
│
├── Pro Claim Tools
│   ├── Claim Research Assistant
│   ├── Nexus Scout Pro
│   ├── CAVC Case Analyzer
│   └── Research Packet Export
│
├── Professional Claim Tools
│   ├── Decision Deconstructor
│   ├── Appeal Strategy Workbench
│   └── Attorney Research Mode
│
└── Internal Systems
    ├── Research Core
    ├── Editorial Automation
    ├── QA / Verification
    └── Admin / Analytics
```

## What To Merge vs. What To Keep Separate

### Merge conceptually

These should feel like one system:

- content site
- research tools
- premium AI workflows
- newsletter
- editorial automation
- admin and review flows

### Keep separate technically if helpful

These can stay as separate services or codebases if needed:

- site
- research backend
- premium tool app
- admin tooling

The priority is experience consolidation, not immediate repo consolidation.

## What Not To Rebuild

Do not spend early cycles rebuilding:

- another generic chatbot
- another raw research tab
- another generic multi-agent demo
- another family of landing pages
- more portfolio-first surfaces
- a new backend architecture from scratch

The infrastructure is already strong enough. The leverage is now in product discipline.

## Milestone Roadmap

## Milestone 1. Unify What Already Exists

### Deliver

- brand consistency
- navigation consistency
- product taxonomy
- shared CTAs
- audience pathways

### Why

This is likely the highest-leverage near-term step.

## Milestone 2. Turn the Content Site into a Real Publication

### Deliver

- editorial standards
- category architecture
- better templates
- hub pages
- newsletter positioning
- policy, research, and case-analysis structure

### Why

This builds trust and SEO depth.

## Milestone 3. Convert Research Runs into Publishable Research Packets

### Deliver

- dossier format
- article generator
- structured outputs
- editor queue
- style guide engine
- QA scoring

### Why

This unlocks scalable authority content.

## Milestone 4. Package Public and Premium Tools

### Deliver

- tool landing pages
- free/pro separation
- value messaging
- use-case pages
- audience-specific positioning

### Why

This creates monetization clarity.

## Milestone 5. Launch Decision Deconstructor

### Deliver

- decision upload UX
- favorable findings extraction
- denial reason mapping
- evidence-gap reporting
- next-step summary

### Why

This becomes the flagship proprietary wedge.

## Milestone 6. Launch the Newsroom Automation Layer

### Deliver

- source monitoring
- automated research packets
- daily and weekly digest generation
- publish recommendations
- feedback analytics

### Why

This turns V2 into a domain-intelligence engine.

## Simplest Build Order From Here

### Build now

- unify V2 brand across app and site
- formalize the editorial system
- add research-packet -> article workflow
- build style guide + QA publish gate
- reflect the locked free/pro/professional catalog in the visible product UI
- launch Decision Deconstructor
- add newsletter + digest automation

## Immediate Operating Principle

The roadmap is no longer:

- foundation -> research -> tools -> publication -> automation

The roadmap is now:

- consolidate -> publish -> package -> monetize -> deepen moat

Because the core AI and research machinery already exists.

## Short-Term Decision Filter

For the next stage, prioritize work that:

- makes the product story clearer
- makes content and tools feel unified
- increases trust
- improves conversion into recurring usage
- strengthens a defensible product wedge

Deprioritize work that:

- adds more disconnected surfaces
- showcases technical complexity without product gain
- duplicates existing capabilities under a new name
- expands architecture before the current system is properly packaged

## Final Takeaway

V2 does not need another reinvention cycle.

It needs:

- simplification
- unification
- packaging
- publication discipline
- monetization discipline

The engine exists.

The next stage is making it feel like a coherent category product instead of several strong systems living side by side.
