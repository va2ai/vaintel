# V2V Strategic & Technical Roadmap: From Decision Deconstructor MVP to 12-Agent Legal Intelligence Platform

**Document Status:** Master Blueprint | Strategic Integration  
**Timeline:** 30-Day MVP Sprint → 12-Month Full Platform Build  
**Target Launch:** Decision Deconstructor (Month 1) → Full Legal Assembly Line (Month 12)

---

## EXECUTIVE VISION

V2V is building the **"Counter-AI" for VA disability claims**—a legal intelligence platform designed to defeat the VA's automated intake system (VBAAP) by translating veteran symptoms into structured, legally sound arguments that survive machine-readable filters.

### The Problem We Solve

**Current State:**
- Veterans navigate rigid, legally complex VA system using emotional, layman's terms
- VA increasingly uses VBAAP (automation) to process claims, creating "automated denials" if evidence doesn't match specific patterns
- "Claim Sharks" charge $1,250/hr for unverifiable nexus opinions
- Generic AI chatbots hallucinate citations and provide dangerous legal guidance

**Our Solution:**
- A **12-agent legal intelligence assembly line** that reverse-engineers the rater's logic
- **Evidence-first architecture** grounded in 38 USC, 38 CFR, BVA precedent, and M21-1 manual
- **Deterministic + LLM hybrid** processing (rules-based for legal, AI for interpretation)
- **3-pillar hallucination defense** (knowledge graphs, citation verification, rigor checks)
- **Professional-grade audit trails** for full traceability

### The Strategic Shift

From: "VA Disability" (carries welfare stigma) + Generic chatbot  
To: **"VA Compensation" (statutory right to compensation for loss of civilian earning capacity)** + Legal intelligence platform

---

## PART 1: THE 12-AGENT LEGAL INTELLIGENCE ARCHITECTURE

### The Strategic Vision: Reverse-Engineering the Rater's Logic

The VA disability system is deterministic. Raters follow hierarchical rules:
1. **Current Diagnosis** — Does the condition exist?
2. **In-Service Event** — Is there service connection?
3. **Nexus** — Does evidence link the two?

If any element fails, the claim is denied. **Our Counter-AI identifies exactly which element failed and prescribes the evidence needed to win.**

### The 12-Agent Assembly Line

#### **TIER 1: INTAKE & INTAKE-ADJACENT (Agents 1-3)**

| Agent | Purpose | "So What?" Factor |
|-------|---------|-------------------|
| **Agent 1: Intake & Routing** | Eliminates system-wide blind processing. Identifies user intent (HLR vs. Secondary Condition exploration). Manages session state and process hooks (Form 20-0995, 20-0996). | Routes every request to the correct specialist. No generic processing. |
| **Agent 2: Document Normalization** | Converts unstructured data (messy PDFs, handwritten notes) into machine-usable records. Handles OCR cleanup, section detection, table extraction for C&P exams, DBQs, STRs, buddy statements. Classifies evidence into Findings Vault. | Transforms chaos into structured, queryable data. |
| **Agent 3: Claim Context Builder** | Constructs the "Case Graph"—unified source of truth for entire agentic ecosystem. Tracks timeline, monitors deadlines. Maps claimed conditions against service-connected percentages. | Single source of truth. Everything references the Case Graph. |

---

#### **TIER 2: REGULATORY & LEGAL INTERPRETATION (Agents 4-5)**

| Agent | Purpose | "So What?" Factor |
|-------|---------|-------------------|
| **Agent 4: CFR Translation** | Decodes Title 38 CFR into plain language. Explains diagnostic code criteria. Manages regulatory constraints: Pyramiding Rule (§ 4.14), Amputation Rule (§ 4.68). Distinguishes binding law vs. M21-1 manual guidance. | Veterans understand "why" the rater said no. |
| **Agent 5: Decision Logic** | **[DECISION DECONSTRUCTOR MVP CORE]** Reverse-engineers rating decisions. Pinpoints failed element: Current Diagnosis, In-Service Event, or Nexus. Extracts hidden favorable findings that support supplemental claims. Identifies "Findings Vault" entries (legally binding under 38 CFR § 3.104(c)). | Transforms opaque "Reasons for Decision" boilerplate into actionable evidence gaps. |

---

#### **TIER 3: EVIDENCE & STRATEGY (Agents 6-9)**

| Agent | Purpose | "So What?" Factor |
|-------|---------|-------------------|
| **Agent 6: Secondary Condition Agent** | Identifies viable secondary pathways based on proximate cause and aggravation (38 CFR § 3.310(b)). Maps complex relationships: PTSD → SSRI medications → weight gain → Sleep Apnea ("Obesity Bridge"). Ranks theories by evidentiary completeness. | Unlocks 2nd/3rd condition claims most veterans miss. |
| **Agent 7: Nexus Evidence Agent** | **[PHASE 2 WEDGE]** Audits medical opinions against Nieves-Rodriguez standard (22 Vet. App. 295). Scores letters: "Magic Words" (at least as likely as not) ✓, C-File Review ✓, Medical Rationale ✓. Prevents opinions from being dismissed as "merely speculative" or "conclusory." | Ensures medical evidence carries probative weight. |
| **Agent 8: Rating Math** | Provides total transparency on "VA Math," bilateral factor, combined rating simulations. Deterministic calculation of whole-person disability percentage. Identifies "percentage jumps" required for total rating increase. | Veterans know exactly what rating = what benefit amount. |
| **Agent 9: Appeals Strategy** | Selects optimal procedural lane: HLR, Supplemental, or Board Appeal based on evidence profile. Identifies "Duty to Assist" errors for HLR requests (Form 20-0996). Flags legal errors vs. evidentiary gaps. | Correct filing strategy = higher success rate. |

---

#### **TIER 4: GOVERNANCE & SAFETY (Agents 10-12)**

| Agent | Purpose | "So What?" Factor |
|-------|---------|-------------------|
| **Agent 10: Citation & Authority** | **[ANTI-HALLUCINATION BACKBONE]** Grounds every output in official hierarchy of authority: 38 USC > 38 CFR > Case Law > M21-1 manual. Attaches precise citations. Resolves conflicting authorities. Uses HalluGraph knowledge graph alignment + Citation Validator MCP. | Every claim is traceable to law. No fabricated citations survive. |
| **Agent 11: Compliance / Safety** | Prevents unauthorized practice of law (UPL). Triggers crisis resources in MH-sensitive flows. Blocks predatory vendor wording ("guaranteed wins"). Enforces strict disclaimer policies. | Platform is research tool, not legal representative. |
| **Agent 12: Synthesis & Response** | Merges specialist outputs into veteran-ready roadmap. Produces: Attorney/VSO handoff memos, evidence gap reports, veteran checklists. Preserves all grounding citations. | Actionable output that veteran can take to their agent/attorney. |

---

### Processing Methodologies

The architecture combines **three processing types:**

1. **Deterministic Processing (Rules-Based)**
   - Calculating Combined Ratings + Bilateral Factor
   - Extracting explicit data from DBQ tables
   - OCR cleanup and document classification
   - Examples: Agent 8 (Rating Math), Agent 2 (Document Normalization)

2. **LLM Interpretation (Logic Mapping)**
   - Mapping ICD-10 codes to Diagnostic Codes
   - Reverse-engineering rater logic from prose
   - Plain-language translation of complex CFR text
   - Identifying "proximate cause" in secondary theories
   - Examples: Agent 5 (Decision Logic), Agent 6 (Secondary Conditions)

3. **Auditing & Verification (Hallucination Defense)**
   - Auditing medical rationale for "speculative" language
   - Fact-checking case citations against BVA database
   - Verifying entity grounding in legal arguments
   - Examples: Agent 7 (Nexus Evidence), Agent 10 (Citation & Authority)

---

## PART 2: THE DECISION DECONSTRUCTOR MVP (30-Day Sprint)

### What Is the Decision Deconstructor?

**The Decision Deconstructor is Phase 1 of the 12-Agent System—a focused wedge product that launches Agent 5 (Decision Logic) + core infrastructure.**

**User Flow:**
1. Veteran uploads VA rating decision (PDF)
2. System extracts: findings, denial basis, rating codes
3. Maps denial against 38 CFR and M21-1
4. Identifies evidence gaps (current diagnosis? in-service event? nexus?)
5. Queries BVA decision database for comparable cases
6. Recommends filing lane: Supplemental Claim vs. HLR vs. CAVC Appeal
7. Outputs: Actionable report with strategy roadmap

**Why This Wedge?**
- **Immediate ROI:** Solves "opaque denial" pain point (highest friction in VA system)
- **Proven market:** Attorneys/VSOs have this exact problem daily
- **Technical validation:** Proves multi-agent orchestration + legal grounding
- **Customer lock-in:** Report quality drives NPS → converts to Pro/Professional tier

---

### Technical Stack

#### **Framework Selection**

| Layer | Technology | Why |
|-------|-----------|-----|
| **Orchestration** | LangGraph 0.2+ | Stateful graph execution, checkpoints, audit trails, conditional routing |
| **Agent Execution** | Claude Agent SDK (2026) | Tool support, extended thinking, native document processing |
| **Document Processing** | Claude Files API + OCR | 350 MB/file, automatic OCR, tenant-isolated, non-training agreement |
| **Retrieval** | LangChain Retrievers + pgvector | Semantic search over 38 CFR, M21-1, BVA decision index |
| **Hallucination Defense** | HalluGraph + FACTUM patterns | Knowledge graph alignment for entity grounding & relation preservation |
| **State Management** | Pydantic v2 | Type-safe state schemas, runtime validation |
| **Observability** | LangSmith + Pydantic Logfire | Token tracking, trajectory analysis, cost monitoring |
| **Deployment** | GCP Cloud Run | Stateful sessions, long timeouts, cost-effective at scale |

#### **Agent Topology with Model Routing**

```
User Upload (PDF)
    ↓
[Agent 1: Intake] — Claude Haiku 4.5 (fast classification)
    ├─ Is it a VA decision? Route accordingly
    ↓
[Agent 2: Document Normalization] — Claude Sonnet 4.5 (parsing + OCR)
    ├─ Extract structured data (findings, rating codes)
    ↓
[Agent 3: Case Context Builder] — Pydantic schema (deterministic)
    ├─ Build Case Graph (timeline, findings vault, deadlines)
    ↓
[Agent 4: CFR Translation] — Claude Sonnet 4.5 (interpretation)
    ├─ Map denial against regulatory framework
    ↓
[Agent 5: Decision Logic] — Claude Opus 4.5 (complex reasoning) ⭐ MVP CORE
    ├─ Reverse-engineer rater's logic
    ├─ Identify failed element (Diagnosis/Event/Nexus)
    ├─ Extract favorable findings for Supplemental Claim
    ├─ Query BVA database for comparable decisions
    ├─ Calculate success probability
    ↓
[Agent 10: Citation & Authority] — Claude Sonnet 4.5 (verification)
    ├─ Verify all CFR cites are real & relevant (HalluGraph)
    ├─ Validate BVA case citations (Citation Validator MCP)
    ├─ Check medical rationale rigor (Medical Opinion Checker)
    ↓
[Agent 11: Compliance / Safety] — Rule-based guardrails
    ├─ Redact PII (SSN, medical details)
    ├─ Enforce disclaimer policies
    ├─ Block risky assertions
    ↓
[Agent 12: Synthesis & Response] — Claude Sonnet 4.5 (formatting)
    ├─ Generate report: findings, gaps, strategy
    ├─ Create downloadable evidence packet
    ↓
Output: Report + Strategy Roadmap
```

#### **Model Assignment Rationale**

| Agent | Model | Cost | Why |
|-------|-------|------|-----|
| Intake | Haiku 4.5 | $0.01 | Classification is trivial; save cost |
| Extraction | Sonnet 4.5 | $0.04 | Balanced: OCR handling + structured extraction |
| CFR Translation | Sonnet 4.5 | $0.04 | Mid-tier reasoning sufficient |
| **Decision Logic** | **Opus 4.5** | **$0.08** | **Complex multi-document reasoning (the thinking-heavy step)** |
| Citation Check | Sonnet 4.5 | $0.04 | Verification is rule-based |
| Synthesis | Sonnet 4.5 | $0.04 | Output formatting; template-driven |
| **Total per document** | **~$0.16** | **At professional tier ($149/mo)** |

---

### 3-Pillar Hallucination Defense (Agent 10)

**Risk:** Legal system requires 100% accuracy. One fabricated citation = malpractice liability.

**Solution:** Triple-layer verification before output.

#### **Pillar 1: Knowledge Graph Alignment (HalluGraph Pattern)**

Extract entities & relations from response, verify against source documents:

```
Assertion: "Under 38 CFR 3.304(d), lay evidence proves service connection."

Entity Extraction:
  Entity 1: 38 CFR 3.304(d) → [verified in source: ✓]
  Entity 2: "lay evidence" → [verified in source: ✓]
  Relation: lay_evidence + proves + service_connection → [verified in CFR: ✓]

Grounding Score: 100% (all entities & relations present in source)
Verdict: PASS
```

**Threshold:** Entity Grounding ≥95% AND Relation Preservation ≥90% = Pass. Otherwise flag for human review.

#### **Pillar 2: Citation Fact-Checking (FACTUM Pattern)**

Every case citation must be verified:

```
Agent claims: "Euzebio v. McDonough establishes that vocational evidence 
cannot be ignored in TDIU adjudication."

Verification:
  1. Case exists? → Look up in BVA/CAVC database ✓
  2. Holding accurate? → Retrieve case text, parse holding ✓
  3. Applies to situation? → Relevance check ✓
  4. Still good law? → Not overruled/vacated ✓

Verdict: ✓ VERIFIED
```

**Tool:** Citation Validator MCP server queries PostgreSQL BVA index.

#### **Pillar 3: Medical Opinion Rigor (Domain-Specific QA)**

VA denials hinge on whether medical opinion meets "at least as likely as not" standard:

```
Opinion Text: "The veteran's migraine is secondary to service-connected anxiety."

QA Checklist:
  □ Uses "at least as likely as not" language (NOT "probably"/"possibly")? ✓
  □ Confirms full C-file review? ✓
  □ Explicit causal chain? ✓
  □ Sufficient explanation (>100 words)? ✓

Rigor Score: 4/4 = SAFE
Verdict: Opinion will carry probative weight
```

**Tool:** Medical Opinion Standard Checker (Sonnet-based rule evaluator).

---

### Findings Vault (Agent 3)

**38 CFR § 3.104(c):** Any "Favorable Finding" in a VA decision is legally binding unless Clear & Unmistakable Error (CUE) is proven.

**The Findings Vault:**
- Extracted and persisted findings from every decision reviewed
- Marked with "CUE Protection" status
- Prevents veteran from re-proving findings in future claims
- Automatically flags supplemental claim strategy (prove only the missing nexus, not the condition itself)

**Example:**
```
FAVORABLE FINDINGS (Locked via CUE Standard)
  ✓ Service connection to PTSD: ESTABLISHED (per decision 2024-01-15)
     Risk Level: NO CUE NEEDED
     Strategy: Don't re-prove PTSD exists. Prove nexus only.
  
  ✓ Rating code 7101: CONFIRMED
     Risk Level: NO CUE NEEDED
     Strategy: Build supplemental on improved rating, not re-establishing connection.
```

---

### Data Layer: BVA/CFR Knowledge Base

```
PostgreSQL + pgvector setup:

TABLE bva_decisions
  - decision_id (PK)
  - citation (e.g., "2024 BVA 12345")
  - condition_code (e.g., "7101 — PTSD")
  - grant_denial (binary: "grant" | "denial")
  - rating_assigned (if grant)
  - holding_text (full decision text)
  - key_cfr_refs (array of referenced CFR sections)
  - grant_rate_by_condition (ML-derived: "PTSD grants at 62% on supplementals")
  - embedding (pgvector for semantic search)

TABLE cfr_sections
  - section_id (e.g., "38 CFR 3.304(d)")
  - title
  - full_text
  - related_sections (array)
  - embedding (pgvector)

TABLE m21_1_policies
  - policy_id
  - manual_section (e.g., "Part III, § 3.04")
  - policy_text
  - effective_date
  - embedding (pgvector)

Query Patterns:
  1. Semantic: "Find BVA decisions similar to this denial"
  2. Keyword: "Find all decisions citing 38 CFR 3.310"
  3. Rule-based: "Find grant rate by condition code"
```

**Data Sources (All Public/Government):**
- BVA Decisions: vabvadecisions.va.gov (public domain)
- CFR: govinfo.gov (public domain)
- M21-1: VA training materials (public domain)
- CAVC Decisions: Federal Circuit PACER (public domain)

---

### User Experience: Three-Column Layout

```
┌─────────────────────────────────────────────────────────────┐
│  V2V DECISION DECONSTRUCTOR (Professional Tier)             │
├──────────────┬──────────────────────┬──────────────────────┐
│              │                      │                      │
│  CASE        │  WORK SURFACE        │  SOURCE VIEWER       │
│  CONTEXT     │  (Active Task)       │  (Reference)         │
│  (Left)      │  (Center)            │  (Right)             │
│              │                      │                      │
│ • Ratings    │ ┌──────────────────┐ │ ┌─────────────────┐ │
│   Awarded    │ │ DECISION         │ │ │ 38 CFR 3.304(d) │ │
│ • Service    │ │ DECONSTRUCTOR    │ │ │                 │ │
│   Connected  │ │ ANALYSIS REPORT  │ │ │ "Lay evidence  │ │
│   Conditions │ │                  │ │ │  of in-service  │ │
│ • Favorable  │ │ [Loading analysis]│ │ │  incurrence..." │ │
│   Findings   │ │ (Real-time        │ │ │                 │ │
│ • Appeal     │ │  streaming)       │ │ └─────────────────┘ │
│   Deadlines  │ │                  │ │                      │
│              │ └──────────────────┘ │ [Can toggle between  │
│              │                      │  raw decision text   │
│              │ [Export PDF]         │  and AI analysis]    │
│              │ [Download Evidence  │                      │
│              │  Packet]            │                      │
│              │                      │                      │
└──────────────┴──────────────────────┴──────────────────────┘

Key: Users see AI's logic side-by-side with source material.
Full transparency. No black-box analysis.
```

---

### API Endpoints (FastAPI Backend)

```
POST /api/v1/decision-deconstructor/analyze
  Input: PDF file + tier (free/pro/professional) + user_id
  Returns: {job_id, status_url}
  
GET /api/v1/decision-deconstructor/{job_id}/status
  Returns: {status, progress %, current_step, results (if done)}
  
GET /api/v1/decision-deconstructor/{job_id}/results
  Returns: Full analysis report (JSON + downloadable PDF)
  
WebSocket /ws/v1/decision-deconstructor/{job_id}
  Real-time streaming updates for long-running analyses
  
GET /api/v1/citations/{section}
  Look up CFR section, case citation, M21-1 policy
  Returns: {text, related_sections, embedding}
  
POST /api/v1/bva-search
  Query BVA decision index by condition, rating, outcome
  Returns: [{citation, holding, grant_rate}, ...]
```

---

### Report Output Template

```
═══════════════════════════════════════════════════════════════
                    DECISION DECONSTRUCTOR
                    Analysis Report v1.0
═══════════════════════════════════════════════════════════════

Decision ID:             [UUID]
Analysis Date:           [DATE]
Veteran Status:          [REDACTED FOR PRIVACY]
Verification Status:     ✓ VERIFIED (HalluGraph + Citations)

DECISION SUMMARY
─────────────────────────────────────────────────────────────
Decision Type:           Rating Decision
Decision Date:           [DATE]
Conditions Analyzed:     PTSD, Migraine
Primary Denial Basis:    Insufficient evidence of service connection

FAVORABLE FINDINGS (Legally Binding — CUE Standard)
─────────────────────────────────────────────────────────────
✓ Service connection to PTSD: ESTABLISHED
  Locked Status: No CUE needed (binding on VA)
  
✓ Rating code 7101: CONFIRMED
  Locked Status: No CUE needed (binding on VA)

DENIAL ANALYSIS
─────────────────────────────────────────────────────────────

Failed Element: IN-SERVICE EVENT (Step 2 of 3)
  Rater's Finding: "Insufficient lay evidence of in-service PTSD"
  CFR Standard: 38 CFR 3.304(d)
  Your Evidence Gap: Missing credible lay statements from unit buddies

Applicable Regulatory Framework:
  • 38 CFR 3.304(d): Lay evidence of in-service event
    [BINDING LAW — Regulation, not manual guidance]
  • M21-1, Part III, § 3.04: Lay evidence procedures
    [GUIDANCE — Manual policy; superseded by CFR if conflict]

Evidence Gaps Identified:
  [GAP 1] In-Service Event (Lay Evidence)
    → Standard: 38 CFR 3.304(d) requires credible lay statement
    → Current Evidence: None in C-file
    → Recommended Evidence: Written statements from 2+ unit members
                           describing combat stressor incident
    → Success Probability: 62% (based on 47 comparable BVA decisions)

COMPARABLE BVA DECISIONS (Similar Facts, Higher Success Rate)
─────────────────────────────────────────────────────────────
• 2023 BVA 9876: Veteran with lay evidence of combat PTSD → GRANTED
• 2023 BVA 8765: Similar facts, buddy statements added → GRANTED (rating upgraded)
• 2023 BVA 7654: Without buddy statements → DENIED (but supplemental succeeded)
  Grant Rate on Supplementals (PTSD, lay evidence focus): 62%

ESTIMATED SUCCESS PROBABILITY
─────────────────────────────────────────────────────────────
Probability of Success:  62% (if supplemental addresses Gap 1)
Confidence Level:        High (47 comparable BVA decisions)

By Filing Lane:
  • Supplemental Claim (Form 20-0995): 62% [RECOMMENDED]
  • HLR (Form 20-0996): 35% (only if VA ignored evidence in file)
  • CAVC Appeal: 48% (legal error required, not evidentiary)

STRATEGY RECOMMENDATION
─────────────────────────────────────────────────────────────
RECOMMENDED FILING LANE: Supplemental Claim (Form 20-0995)

Why Supplemental?
  - You've already proved service connection (favorable finding locked)
  - You've already proved PTSD diagnosis (favorable finding locked)
  - Only missing: In-service event lay evidence
  - Supplemental allows you to add NEW evidence without re-proving existing findings
  - Success rate is HIGHER than HLR (62% vs. 35%)

NEXT STEPS:
  1. Gather written statements from unit members
     (Focus: Combat stressor incident, PTSD symptoms observed)
  2. Have statements notarized (increases credibility)
  3. File Form 20-0995 (Supplemental Claim) with new evidence
  4. VA has 180 days to decide (can be faster)
  5. If denied again, can file Board Appeal with attorney

QUALITY ASSURANCE RESULTS
─────────────────────────────────────────────────────────────
✓ CFR Citation Verification:     PASSED (all 3 citations verified)
✓ Case Citation Verification:    PASSED (all 2 cases verified)
✓ BVA Comparable Data:           PASSED (47 comparable decisions found)
✓ Medical Opinion Rigor:         N/A (no medical opinions in decision)
✓ Knowledge Graph Grounding:     PASSED
  - Entity Grounding: 98%
  - Relation Preservation: 96%

Overall Verification Status: ✓ VERIFIED
No flagged assertions requiring human review.

HIERARCHY OF AUTHORITY
─────────────────────────────────────────────────────────────
This analysis ranks authority as follows (highest to lowest):

1. 38 USC § 3.304 [STATUTE — Binding Law]
2. 38 CFR 3.304(d) [REGULATION — Binding Law]
3. Nieves-Rodriguez v. Peake, 22 Vet. App. 295 [CASE LAW — Binding]
4. M21-1, Part III, § 3.04 [GUIDANCE — Manual only; advisory]

If any authority conflicts, statute supersedes regulation supersedes case law
supersedes manual guidance.

DISCLAIMER
─────────────────────────────────────────────────────────────
⚠️  THIS IS NOT LEGAL ADVICE.

This analysis is generated by an AI system and is provided for
informational purposes only. It is not a substitute for advice from
an accredited VA claims agent, VSO, or attorney.

Before filing any claim or appeal, consult with a qualified VA representative.

V2V Decision Deconstructor is independently researched and grounded in
38 CFR, M21-1 manual, and BVA precedent. Not affiliated with the VA.

═══════════════════════════════════════════════════════════════
Report Generated: [TIMESTAMP]
Analysis ID: [UUID]
Source: V2V Decision Deconstructor v1.0
```

---

## PART 3: 30-DAY MVP SPRINT ROADMAP

### Success Criteria at Launch

| Metric | Target | Why It Matters |
|--------|--------|-----------------|
| **Extraction Accuracy** | ≥95% | Wrong denial basis = wrong advice |
| **Hallucination Detection** | ≥95% on test suite | Legal risk; user trust |
| **Processing Speed** | <60 sec/doc | User experience (impatience = abandonment) |
| **Cost per Document** | <$0.20 | Unit economics at $149/mo professional tier |
| **Uptime** | ≥99.5% | Professional SLA |
| **Beta NPS** | ≥40 | Product-market fit signal |
| **Compliance Pass** | ✓ | PII redaction, audit logs, non-training agreement |

### Week-by-Week Breakdown

#### **WEEK 1: SCAFFOLDING & INFRASTRUCTURE (Days 1-7)**

**Day 1: Infrastructure Setup**
- [ ] GCP Cloud Run project (v2v-decision-deconstructor)
- [ ] Cloud SQL PostgreSQL instance
- [ ] GCS bucket for PDFs
- [ ] .env file with secrets (Anthropic, LangSmith, GCP, Stripe)
- [ ] GitHub monorepo structure
- [ ] Docker + docker-compose for local dev

**Exit Criteria:** `docker-compose up` → FastAPI server + PostgreSQL running on localhost:8000

**Days 2-3: LangGraph State Schema & Agent Topology**
- [ ] Define Pydantic v2 ExtractionState schema
- [ ] Design LangGraph node architecture (5 agents: Intake → Extraction → Analysis → Verification → Synthesis)
- [ ] Define conditional edges (routing logic)
- [ ] Create agent node signatures

**Exit Criteria:** Graph compiles without errors; dummy nodes execute

**Day 4: Agent Node Scaffolds & Tool Stubs**
- [ ] Scaffold all 5 agent functions
- [ ] Define tool stubs (BVA Search, CFR Navigator, Citation Validator, Medical Opinion Checker)

**Exit Criteria:** Graph still compiles; nodes return updated state

**Days 5-6: Core Agent Implementation (Intake + Extraction)**
- [ ] Implement Intake Agent (Haiku): PDF classification
- [ ] Implement Extraction Agent (Sonnet): Structured data extraction (findings, denial basis, rating codes)
- [ ] PDF → text conversion via Claude Files API

**Exit Criteria:** Test on 1 real VA decision; reasonable JSON output

**Day 7: End-to-End Test (No QA)**
- [ ] Run full graph: PDF → Intake → Extraction → Synthesis (dummy)
- [ ] Document results

**Exit Criteria:** Graph executes without crashing; extraction shows reasonable output

---

#### **WEEK 2: EXTRACTION & ANALYSIS AGENTS (Days 8-14)**

**Days 8-9: Extraction Agent Polish**
- [ ] Implement Claude Files API OCR handling
- [ ] Use structured output mode (JSON)
- [ ] Test on 5 real VA decisions

**Exit Criteria:** 85%+ accuracy on test decisions

**Days 10-11: CFR/BVA Analysis Agent & Database Indexing**
- [ ] Build BVA decision index (PostgreSQL)
- [ ] Index 38 CFR sections
- [ ] Implement CFR Analysis Agent (Opus): Cross-reference + BVA lookup
- [ ] Calculate success probability based on grant rates

**Exit Criteria:** Database queries return results; Agent runs without errors

**Days 12-13: Comprehensive Extraction Testing**
- [ ] Test extraction on 10 real VA decisions
- [ ] Document failures, refine prompts

**Exit Criteria:** ≥90% accuracy on extraction

**Day 14: Refinement**
- [ ] Fix extraction failures
- [ ] Commit updated agents

**Exit Criteria:** Extraction ready for next phase

---

#### **WEEK 3: HALLUCINATION DETECTION & QA (Days 15-21)**

**Days 15-16: HalluGraph Verification (Knowledge Graph Pattern)**
- [ ] Implement knowledge graph extraction
- [ ] Calculate Entity Grounding % + Relation Preservation %
- [ ] Define pass/flag/fail thresholds

**Days 17-18: Citation Validator (Fact-Check Against Database)**
- [ ] Implement Citation Validator MCP server
- [ ] Verify case citations exist in BVA index
- [ ] Verify CFR sections are real

**Day 19: Medical Opinion Rigor Checker**
- [ ] Implement rule-based checker for "at least as likely as not" language
- [ ] Detect speculative phrases ("probably", "possibly")
- [ ] Verify C-file review statement

**Days 20-21: Comprehensive QA Testing**
- [ ] Run test suite: 20 synthetic claims with intentional errors
- [ ] Target: 95% detection of hallucinations

**Exit Criteria:** 95%+ hallucination detection rate on synthetic suite

---

#### **WEEK 4: INTEGRATION, TESTING & DEPLOYMENT (Days 22-30)**

**Days 22-23: End-to-End Integration Testing**
- [ ] Test full graph on 5 real CAVC decisions with known outcomes
- [ ] Compare recommended filing lane vs. actual successful lane
- [ ] Target: ≥80% alignment

**Day 24: Cost & Latency Optimization**
- [ ] Profile token usage per document
- [ ] Implement prompt caching (system prompts at 10% cost)
- [ ] Parallelize extraction + CFR analysis
- [ ] Target: <60 sec/doc, <$0.20/doc

**Day 25: Report Template & Styling**
- [ ] Implement Jinja2 report template
- [ ] Test PDF export
- [ ] Validate report readability

**Day 26: Deploy to Staging (Cloud Run)**
- [ ] Build Docker image
- [ ] Deploy to v2v-dd-staging.run.app
- [ ] Test health endpoints

**Days 27-28: Beta Testing with Attorneys/VSOs**
- [ ] Recruit 3-5 beta testers
- [ ] Collect feedback (usability, accuracy, legal rigor)
- [ ] Target NPS: ≥40

**Days 29-30: Production Deployment + Monitoring**
- [ ] Deploy to production
- [ ] Set up Cloud Monitoring dashboard
- [ ] Configure alerting (error rate, latency, uptime)
- [ ] Runbook documentation

**Exit Criteria:** <60 sec/doc, <$0.20/doc, NPS ≥40, 99.5% uptime

---

### Test Suites (Quality Gates)

#### **Test Suite 1: Extraction Accuracy (Day 13)**
- 10 real VA decisions (FOIA-obtained)
- Metric: Denial basis, rating codes match ground truth
- **Success Threshold:** ≥95%

#### **Test Suite 2: Hallucination Detection (Day 21)**
- 20 synthetic claims with intentional errors
  - Wrong CFR section (e.g., "38 CFR 3.404" vs. "3.304")
  - Fake case citation
  - Speculative medical language
- **Success Threshold:** ≥95% detection

#### **Test Suite 3: Strategy Alignment (Day 23)**
- 5 real CAVC decisions with known outcomes
- Compare recommended filing lane vs. actual success path
- **Success Threshold:** ≥80% alignment

#### **Test Suite 4: User Acceptance (Days 27-28)**
- 3-5 beta testers (attorneys/VSOs)
- Upload 3 decisions each, collect NPS
- **Success Threshold:** NPS ≥40

---

### Effort & Budget

**Team:**
- 1x Full-Stack AI Engineer (you)
- 0.5x QA contractor (days 18-25, optional)
- 3-5x Beta testers (pro bono)

**Effort:** ~170 hours (~4.25 weeks FTE)

**Costs:**
- GCP (Cloud Run, Cloud SQL): ~$150
- Anthropic API: ~$200 (test documents + token usage)
- LangSmith: ~$50
- **Total: ~$400**

---

## PART 4: POST-MVP ROADMAP (Months 2-12)

### Month 2-3: Phase 2 Launch — Agents 6-7

#### **Agent 6: Secondary Condition Mapper**
**What:** Identify viable secondary condition pathways via aggravation (38 CFR § 3.310(b))

**Example Workflow:**
```
Primary: Service-connected Mental Health (PTSD)
↓
Secondary Theory 1: SSRI Medications → Weight Gain → Sleep Apnea
  Evidence Required: Medication list, BMI logs, sleep study
  
Secondary Theory 2: PTSD → Sleep Deprivation → Migraines
  Evidence Required: Sleep logs, headache records, nexus opinion
  
Secondary Theory 3: Service-connected Tinnitus → Insomnia → Hypertension
  Evidence Required: Sleep study, BP logs, nexus opinion
```

**MVP Output:** "Obesity Bridge" discovery + evidence checklist

#### **Agent 7: Nexus Evidence Scorer (Phase 2 Wedge)**
**What:** Audit medical opinions against Nieves-Rodriguez standard

**Example:**
```
INPUT: Medical opinion letter from VA-contract doctor
OUTPUT: Scoring against 3 pillars:

✓ Magic Words: "at least as likely as not" — PRESENT
✓ C-File Review: "I reviewed entire C-file and STRs" — PRESENT
✓ Medical Rationale: Cites PubMed study #12345678 — PRESENT

Verdict: Opinion will carry probative weight (3/3 pillars met)
Success Probability: 78% (based on 125 comparable CAVC decisions)
```

### Month 4-6: Phase 3 Launch — Agents 8-9

#### **Agent 8: VA Math Calculator**
- Input: Current ratings + proposed new ratings
- Output: Combined rating, bilateral factor, monthly benefit delta
- Example: "Upgrading PTSD from 50% to 70% = $347/month increase"

#### **Agent 9: Appeals Strategy Optimizer**
- HLR (Higher-Level Review) vs. Supplemental vs. Board Appeal
- "Duty to Assist" error detection
- Legal error vs. evidentiary gap classification

### Month 7-9: Phase 4 Launch — Advanced Mapping

#### **Deep Integration of Agents 1-12**
- Case graph persistence (full veteran history)
- Appeal deadline tracking
- Findings vault querying
- Multi-stage appeal orchestration

### Month 10-12: Phase 5 Launch — Analytical Tier

#### **Precedent Mining & Longitudinal Memory**
- Track BVA decision trends over time
- Predict outcome probability based on judge assignment
- Identify emerging legal theories

---

## PART 5: COMMERCIALIZATION STRATEGY

### Market Positioning

**From:** Generic "VA Disability Chatbot"  
**To:** "VA Compensation Intelligence Platform" (Counter-AI for automated denial systems)

### Tiered Pricing Model

| Tier | Price | Utilities | Target User |
|------|-------|-----------|-------------|
| **Free** | $0 | BVA Decision Search, 38 CFR Navigator, KnowVA Search | Casual researchers, self-filers |
| **Pro** | $49/mo | Decision Deconstructor (limited), Claim Research Assistant, saved research | Individual claimants, serious self-filers |
| **Professional** | $149/mo | Decision Deconstructor (unlimited), Advanced BVA Analytics, Attorney Research Mode, API access | Attorneys, VSOs, accredited agents |

### Launch Strategy

**Month 1:**
- Decision Deconstructor MVP (Agent 5) ships to beta testers
- Gather NPS & feedback
- Refine based on real-world usage

**Month 2:**
- GA (general availability) launch
- Announce on Reddit (/r/VeteransBenefits), VSO networks
- Target: 50 Professional tier subscriptions (revenue: $7,500/mo)

**Month 3:**
- Phase 2 (Agents 6-7) ships
- Grow to 150 Professional subscriptions (revenue: $22,500/mo)

**Month 6:**
- Full legal assembly line operational
- B2B partnerships with largest VSO networks
- Enterprise licensing: VSOs pay per-attorney, unlimited documents

**Month 12:**
- 500+ Professional subscriptions
- 20+ enterprise VSO partnerships
- Revenue: $75,000+/mo
- Profitable unit economics

---

## PART 6: RISK MITIGATION

### Technical Risks

| Risk | Mitigation |
|------|-----------|
| Claude hallucinates CFR citations | 3-pillar hallucination defense + Citation Validator MCP + human review flags |
| BVA database becomes stale | Automated daily refreshes from VA appeals data; version control |
| Performance degrades at scale | Prompt caching, pgvector indexing, Cloud Run auto-scaling |

### Legal Risks

| Risk | Mitigation |
|------|-----------|
| UPL (Unauthorized Practice of Law) | Prominent disclaimer: "NOT LEGAL ADVICE"; research tool only; no representation claims |
| Malpractice liability | Audit trail for every decision; full citations; human review for flagged assertions |
| Veteran misuses output as legal filing | Explicit warnings; disclaimers in every report; recommend consulting agent before filing |

### Market Risks

| Risk | Mitigation |
|------|-----------|
| VA.gov releases competing tool | V2V has 2-year head start; focus on quality + ease of use; build loyal user base |
| LexisNexis/Thomson Reuters enter market | V2V is specialized (VA only); they are generalist; focus on depth, not breadth |
| Claim Sharks discount pricing | V2V's value is correctness + audit trail, not cost; attract quality-conscious users |

---

## PART 7: SUCCESS METRICS (12-Month Vision)

### Product Metrics

| Metric | Month 3 Target | Month 6 Target | Month 12 Target |
|--------|---|---|---|
| DAU (Daily Active Users) | 50 | 200 | 1,000+ |
| Professional Subscriptions | 50 | 150 | 500+ |
| NPS (Net Promoter Score) | ≥40 | ≥45 | ≥50 |
| Report Quality Score | 4.0/5 | 4.3/5 | 4.5/5 |
| Hallucination Rate | <5% | <2% | <1% |

### Business Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| MRR (Monthly Recurring Revenue) | $7,500 | $22,500 | $75,000+ |
| Churn Rate | <10% | <5% | <3% |
| CAC (Customer Acquisition Cost) | $50 | $30 | $20 |
| LTV (Lifetime Value) | $1,500 | $3,000+ | $5,000+ |
| Gross Margin | 75% | 80% | 85% |

---

## PART 8: DEFINITION OF "DONE" (MVP LAUNCH)

**Development:**
- ✓ All 5 MVP agents implemented and tested
- ✓ Hallucination detection ≥95% on synthetic test suite
- ✓ Extraction ≥90% accuracy on real decisions
- ✓ End-to-end flow <60 seconds per document
- ✓ Cost <$0.20 per document

**Quality:**
- ✓ 5 real CAVC test decisions pass ≥80% alignment
- ✓ Zero PII leaks (automated redaction + testing)
- ✓ Audit trail complete (input → analysis → output logged)
- ✓ All CFR/case citations verified or flagged

**Go-Live:**
- ✓ Deployed to Cloud Run (production)
- ✓ Monitoring + alerting configured
- ✓ Beta testing NPS ≥40
- ✓ Documentation + runbook complete
- ✓ Legal disclaimers on every report

---

## CONCLUSION: THE COUNTER-AI VISION

V2V is building the **operating system for VA compensation claims**—a technical layer that defeats automated denial patterns by translating veteran symptoms into machine-readable, legally defensible arguments.

**The 12-agent architecture is ambitious, but achievable.** The Decision Deconstructor MVP is the proof-of-concept. Within 30 days, you'll have a product that:

- ✓ Solves the #1 pain point (opaque denials)
- ✓ Proves multi-agent orchestration at scale
- ✓ Attracts premium-tier users (attorneys/VSOs)
- ✓ Funds the build of Agents 6-12

**Success looks like:** Veterans navigating the VA system with **evidence-based intelligence, full legal transparency, and actionable roadmaps**—not hope.

---

**Document Version:** 1.0 (Combined Master Blueprint)  
**Status:** Ready for 30-Day MVP Sprint  
**Maintained By:** Chris Combs, Veteran 2 Veteran LLC  
**Last Updated:** March 8, 2026
