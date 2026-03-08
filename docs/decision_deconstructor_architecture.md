# Decision Deconstructor MVP: Complete Architecture Assessment

**Target Timeline:** 30 days to MVP  
**Primary Goal:** Wedge product for market entry—transform VA denial/appeal documents into actionable claim strategy with defensible, evidence-grounded analysis.

---

## 1. System Overview & Value Proposition

### The Product Promise
Veterans upload a VA rating decision or denial (PDF). The Decision Deconstructor:
1. **Extracts** "Favorable Findings" and denial rationale from the decision
2. **Maps** the denial against 38 CFR, M21-1, and established BVA grant patterns
3. **Scores** the estimated success probability for appeal based on comparable decisions
4. **Surfaces** evidence gaps and recommends next filing lane (Supplemental Claim vs. HLR)
5. **Prevents hallucination**: Every CFR cite, case citation, and medical rationale is verified against grounded sources

### Why This Wins vs. Competitors
- **Generic AI chatbots** (e.g., ChatGPT + "VA Law"): No domain grounding, 40%+ hallucination rate
- **"Claim Sharks"** ($1,250/hour): Charge for unverifiable nexus opinions; lack procedural depth
- **V2 Decision Deconstructor**: Grounded in CFR, BVA decisions, M21-1 manual; human-in-the-loop verification; $149/mo professional tier

---

## 2. Architecture Topology

### Selected: **Stateful Graph + Multi-Agent Orchestration** (LangGraph + Claude Agent SDK)

**Why this topology?**
- The workflow has clear branching: Document extraction → Classification → Analysis → Strategy synthesis. LangGraph's state machine handles this with checkpoints and rollback capability.
- Decision analysis requires multi-step reasoning (extract findings → cross-reference CFR → score BVA patterns → synthesize strategy). Claude Agent SDK's tool-calling + reasoning handles this elegantly.
- Professional users need audit trails. LangGraph's state checkpoints provide full traceability.

**Alternative considered & rejected:**
- CrewAI: Good for role-based teams, but less fine control over state flow.
- Single-call Claude API: Fast, but no ability to checkpoint or recover from partial failures.

---

## 3. Framework Stack Selection

| Layer | Framework | Version | Rationale |
|-------|-----------|---------|-----------|
| **Orchestration** | LangGraph | 0.2+ (latest) | Stateful graph execution, conditional routing, checkpoints. Core of the system. |
| **Agent Execution** | Claude Agent SDK | Latest (2026) | Full tool support, extended thinking for complex legal reasoning, native document processing. |
| **Document Processing** | Claude Files API + OCR | Native | 350 MB per file, automatic OCR for scanned decisions, tenant-isolated. |
| **Retrieval (CFR/BVA)** | LangChain Retrievers + pgvector | Latest | Semantic search over indexed CFR, M21-1, BVA decision database. |
| **Hallucination Detection** | HalluGraph + FACTUM patterns | 2026 research | Knowledge graph alignment for entity grounding & relation preservation. Custom lightweight extractor for CFR/case citations. |
| **State Management** | Pydantic v2 | v2.0+ | Type-safe state schemas, runtime validation, serialization for audit logs. |
| **Observability** | LangSmith + Pydantic Logfire | Latest | Token tracking, trajectory analysis, cost monitoring per document. |
| **Deployment** | GCP Cloud Run | Latest | Your existing V2V infrastructure. Serverless scales for burst uploads. |

---

## 4. Agent Topology & Model Routing

```
User Upload (PDF)
    ↓
[Intake Agent] — Claude Haiku 4.5 (fast classification)
    ↓
    ├─ Is it a VA decision? (yes/no/unclear)
    ├─ Route to extraction pipeline
    ↓
[Extraction Agent] — Claude Sonnet 4.5 (document parsing + OCR handling)
    ├─ Extract findings, denial basis, rating codes
    ├─ Identify service-connected conditions
    ├─ Pull decision narrative
    ↓
[CFR & BVA Analysis Agent] — Claude Opus 4.5 (complex reasoning)
    ├─ Cross-reference findings against 38 CFR 3.304(d), 3.310, Part 4
    ├─ Query BVA decision database for comparable grant patterns
    ├─ Identify favorable findings veteran may have missed
    ├─ Score estim. success probability
    ↓
[Hallucination Verification Agent] — Claude Sonnet 4.5 (grounding check)
    ├─ Verify every CFR cite is real & relevant
    ├─ Verify every case citation (Euzebio, Nieves-Rodriguez, etc.) is correct
    ├─ Check medical rationales are not speculative
    ├─ Flag risky assertions for human review
    ↓
[Strategy Synthesis Agent] — Claude Sonnet 4.5 (output synthesis)
    ├─ Generate report: findings summary, evidence gaps, recommended next filing
    ├─ Create exportable packet for attorney/advocate
    ↓
User Output (Report + Strategy Recommendation)
```

### Model Assignment Rationale

| Agent | Model | Why |
|-------|-------|-----|
| Intake | Haiku 4.5 | Classification is trivial. Save $$ at entry. |
| Extraction | Sonnet 4.5 | Balanced: OCR handling + structured extraction. Mid-cost. |
| Analysis (CFR/BVA) | **Opus 4.5** | Complex multi-document reasoning. This is the "thinking-heavy" step. Worth the cost. |
| Hallucination Check | Sonnet 4.5 | Verification is rule-based; Sonnet can execute fact-checks. |
| Strategy Synthesis | Sonnet 4.5 | Output formatting. Template-driven. Sonnet sufficient. |

**Cost estimate per document (simplified):**
- Input tokens: ~10K (PDF + context)
- Output tokens: ~5K (analysis + report)
- Haiku: $0.01 | Sonnet: $0.07 (3 calls) | Opus: $0.08 (1 call)
- **Total: ~$0.16/document** at professional tier ($149/mo with ~100 documents included)

---

## 5. Protocol Stack & Tool Ecosystem

### Three-Layer Protocol Standard

| Protocol | Layer | Implementation | Purpose |
|----------|-------|----------------|---------|
| **MCP** | Agent ↔ Tools | Custom MCP servers for BVA search, CFR lookup, M21-1 navigator | Standardized tool access. Decouples agent from tool implementation. |
| **A2A** | (Optional) Agent ↔ Agent | LangGraph state messages (message passing between nodes) | Inter-agent coordination happens via graph state. A2A formal protocol not needed for this scope, but architecture supports it. |
| **AG-UI** | (Optional) Agent ↔ Frontend | FastAPI streaming endpoints (SSE) | Real-time progress display for users. Checkpoint/resume capability. |

### MCP Servers Required (Phase 1 MVP)

```
1. BVA Decision Search Server
   - Query: BVA decisions by condition, rating, grant/denial pattern
   - Returns: Citation, holding, relevant CFR references
   
2. CFR & M21-1 Navigator Server
   - Query: 38 CFR section, rating schedule entry, M21-1 policy
   - Returns: Full text, hyperlinks, related sections
   
3. Citation Validator Server
   - Query: Case name/citation, CFR reference
   - Returns: Verified citation, full case text (if BVA), status (overruled/vacated)
   
4. Medical Opinion Standard Checker
   - Query: Medical rationale text
   - Returns: Is it "at least as likely as not" formulation? Full C-file review mentioned?
```

### Tools Accessible to Each Agent

**Extraction Agent has:**
- PDFLoader (Claude Files API) → OCR
- DecisionParser (custom NLP tool)

**CFR/BVA Analysis Agent has:**
- BVA Decision Search
- CFR Navigator
- M21-1 Navigator
- Comparable Decision Scorer (lookup tool)

**Hallucination Verification Agent has:**
- Citation Validator
- CFR Reference Checker
- Medical Opinion Standard Checker
- Case Law Authority Verifier

---

## 6. Memory & State Architecture

### State Schema (Pydantic v2)

```python
from pydantic import BaseModel, Field
from typing import Optional, List

class ExtractionState(BaseModel):
    decision_id: str
    decision_type: str  # "Rating Decision", "CAVC Decision", etc.
    veteran_name: Optional[str] = None  # Redacted in output
    
    # Extracted findings
    service_connected_conditions: List[str]
    favorable_findings: List[str]  # Things VA conceded
    denial_basis: str  # Why VA denied
    rating_codes: List[str]
    decision_date: Optional[str]
    
    # Analysis layer
    cfr_references: List[dict]  # {section, text, relevance_score}
    bva_comparables: List[dict]  # {case_id, holding, grant_rate}
    evidence_gaps: List[str]
    success_probability: float  # 0-100
    recommended_filing_lane: str  # "Supplemental Claim" | "HLR" | "CAVC Appeal"
    
    # QA layer
    hallucination_flags: List[dict]  # {assertion, risk_level, human_review_needed}
    verification_status: str  # "passed", "flagged", "needs_human_review"
    
    # Audit trail
    processing_timestamp: str
    model_versions_used: dict
    token_usage: dict
```

### Memory Strategy

| Layer | Storage | Purpose |
|-------|---------|---------|
| **Short-term** | LangGraph state dict | Current document processing, intermediate results |
| **Working Memory** | Pydantic checkpoints (serialized state) | Rollback capability; resume interrupted processing |
| **Long-term** | PostgreSQL + pgvector | Processed decisions (redacted), BVA decision index, CFR cache, user research history (Pro/Professional tiers) |
| **Cache** | Claude prompt caching | System prompts for each agent, CFR sections (read 100x, cache at 10% cost), tool definitions |

**No browser localStorage.** All session state lives server-side.

---

## 7. Hallucination & Quality Assurance Architecture

### The V2V Difference: Evidence-First Verification

Standard RAG systems claim "hallucination-free" but still hallucinate at 17–33% rates (per Stanford 2025 study). V2V uses a **three-pillar defense**:

#### Pillar 1: Structural Grounding (HalluGraph Pattern)

After synthesis, decompose every assertion into a knowledge graph:

```
Assertion: "Under 38 CFR 3.304(d), lay evidence is accepted as proof of service connection."

Extract entities & relations:
  Entity 1: 38 CFR 3.304(d) → [verified in source docs: ✓]
  Entity 2: "lay evidence" → [verified in source: ✓]
  Relation: lay evidence + proof of service connection → [verified in CFR text: ✓]
  
Grounding Score: 100% (all entities & relations present in source)
```

**Tools:**
- Custom lightweight extractor (Sonnet) pulls sentences → entities/relations
- Verification agent checks each entity against indexed CFR/case database
- Output: Entity Grounding (EG) % + Relation Preservation (RP) %
- **Threshold:** EG ≥ 95% AND RP ≥ 90% = Pass. Otherwise flag for human review.

#### Pillar 2: Citation Fact-Checking (FACTUM Pattern)

Every case citation must be verified:

```
Agent claims: "Euzebio v. McDonough establishes that vocational evidence cannot be ignored in TDIU adjudication."

Verification:
  1. Case exists? → Look up 2024 BVA/CAVC DB
  2. Holding accurate? → Retrieve case text, parse holding
  3. Applies to this situation? → Relevance check
  4. Still good law? → Is it overruled/vacated?
  
Output: ✓ Verified | ⚠ Partial | ✗ Hallucinated
```

**Tool:** Citation Validator MCP server. If citation fails, flag assertion for human review.

#### Pillar 3: Medical Opinion Rigor (Domain-Specific QA)

VA denials often hinge on whether a medical opinion meets the "at least as likely as not" standard. Check every medical assertion:

```
Assertion: "The veteran's migraine is secondary to service-connected anxiety."

QA checklist:
  □ Does the opinion use "at least as likely as not" language? (NOT "probably" or "possibly")
  □ Does the doctor confirm full C-file review?
  □ Is the causal chain explicit? (anxiety → migraine pathway stated?)
  □ No contradictions with VA's own medical evidence?
  
Score: 0-4 points. ≥3 = Safe assertion. <3 = Flag for attorney review.
```

**Tool:** Medical Opinion Standard Checker (Sonnet-based rule checker).

---

## 8. QA Evaluation Framework

### Pre-Deployment Testing (Days 1-20)

#### Test Suite 1: Extraction Accuracy
- **10 real VA decisions** (anonymized, FOIA'd)
- Metric: Did the agent extract the correct denial basis, favorable findings, rating codes?
- Success threshold: 95% accuracy on structured fields (denial basis, rating codes)

#### Test Suite 2: CFR/Legal Grounding
- **20 synthetic claims** with intentional errors
  - E.g., "38 CFR 3.404(d)" [wrong section] vs. "38 CFR 3.304(d)" [correct]
  - E.g., False case: "Smith v. McDonough" vs. real case: "Euzebio v. McDonough"
- Metric: Did hallucination detector catch the error?
- Success threshold: 95% detection of intentional errors

#### Test Suite 3: End-to-End Strategy Output
- **5 real decisions** from CAVC case DB (known outcomes)
- Run Decision Deconstructor → compare recommended filing lane vs. actual outcome
- Metric: Did the system recommend the same path veterans actually succeeded with?
- Success threshold: 80% recommendation alignment

#### Test Suite 4: Cost & Latency
- **100 documents** (mix of 5-50 page PDFs)
- Measure: End-to-end processing time, token usage, cost per document
- Target: <60 seconds per document (Opus call is the bottleneck), <$0.20/doc at professional tier

---

## 9. Data Layer: BVA/CFR Knowledge Base

### Indexing Strategy

```
PostgreSQL + pgvector setup:

TABLE bva_decisions
  - decision_id (PK)
  - citation (e.g., "2024 BVA 12345")
  - condition_code (e.g., "PTSD", "Migraine")
  - grant_denial (binary)
  - rating_assigned (if grant)
  - holding_text (full decision text)
  - key_cfr_refs (array of referenced CFR sections)
  - case_date
  - embedding (pgvector, for semantic search)
  
TABLE cfr_sections
  - section_id (e.g., "38 CFR 3.304(d)")
  - title
  - full_text
  - parent_section
  - related_sections (array)
  - embedding (pgvector)
  
TABLE m21_1_policies
  - policy_id
  - manual_section
  - policy_text
  - effective_date
  - superseded_date (if applicable)
  - embedding (pgvector)
  
Query patterns:
  1. Semantic: Find BVA decisions similar to this denial
  2. Keyword: Find all decisions citing "38 CFR 3.310"
  3. Rule-based: Find grant rate by condition code
```

### Data Sources

- **BVA Decisions**: Public VA appeals data (vabvadecisions.va.gov). License check: public domain.
- **CFR**: govinfo.gov, public domain.
- **M21-1**: VA's official manual, public domain (VA training materials).
- **CAVC Decisions**: Federal Circuit PACER system, public domain.

**No proprietary legal databases (e.g., Westlaw). All sources are government/public.**

---

## 10. Frontend Integration & User Experience

### Interaction Flows

#### Flow 1: Free Tier (BVA Decision Search, CFR Navigator)
```
User → Search "PTSD rating" → Retrieve 10 comparable BVA decisions → Display grant rates → [Subscribe to Pro for full analysis]
```

#### Flow 2: Professional Tier (Decision Deconstructor)
```
User → Upload VA decision (PDF) 
  → [Show progress: "Extracting... Analyzing... Verifying..."] 
  → LangGraph streaming updates (SSE) 
  → Display report in 60 seconds 
  → [Downloadable strategy packet]
```

### Report Output Template

```
═══════════════════════════════════════════════════════════
          DECISION DECONSTRUCTOR ANALYSIS REPORT
═══════════════════════════════════════════════════════════

Decision Date: [DATE]
Condition(s) Analyzed: [LIST]

FAVORABLE FINDINGS (What VA Conceded):
  - Service connection to [CONDITION]: ✓ Granted
  - Rating code [CODE]: ✓ Confirmed
  [...]

DENIAL BASIS (Why VA Rejected Higher Rating):
  Stated reason: [EXTRACTED FROM DECISION]
  38 CFR reference: 38 CFR [SECTION]
  
LEGAL ANALYSIS:
  
  Gap 1: [Evidence gap description]
    → CFR requirement: 38 CFR [SECTION]
    → Comparable BVA decisions (grant rate: 62%): [3 citations]
    
  Gap 2: [Evidence gap description]
    → Recommended remedy: Provide [specific evidence]

ESTIMATED SUCCESS PROBABILITY: [SCORE]
  Based on [N] comparable BVA decisions w/ similar facts
  
RECOMMENDED NEXT FILING LANE:
  ☐ Supplemental Claim (if new evidence available) — recommended if Gap 1 is solvable
  ☐ HLR (if VA ignored existing evidence) — recommended if Gap 2 applies
  ☐ CAVC Appeal (if purely legal error) — recommended if [condition]

VERIFICATION STATUS:
  ✓ All CFR citations verified
  ✓ All case citations verified
  ⚠ Medical opinion rigor: [SCORE]/4 — [comment if <3]
  
═══════════════════════════════════════════════════════════
```

### API Endpoints

```
POST /api/v1/decision-deconstructor/analyze
  Input: PDF file (multipart/form-data) + tier + user_id
  Returns: {job_id, status_url}
  
GET /api/v1/decision-deconstructor/{job_id}/status
  Returns: {status, progress %, current_step, results (if done)}
  
GET /api/v1/decision-deconstructor/{job_id}/results
  Returns: Full analysis report (JSON + downloadable PDF)
  
WebSocket /ws/v1/decision-deconstructor/{job_id}
  Real-time streaming updates for long-running analyses
```

---

## 11. Deployment Architecture

### Infrastructure (Existing V2V Stack)

```
GCP Cloud Run:
  - FastAPI backend (Python 3.12+)
  - Runs LangGraph orchestrator
  - Calls Claude API (Sonnet + Opus)
  - Queries PostgreSQL (CFR/BVA index)
  
Cloud SQL (PostgreSQL):
  - BVA decision index (pgvector embeddings)
  - CFR sections (indexed by section ID + embeddings)
  - User research history (Pro/Professional tiers)
  - Processing audit logs
  
Cloud Storage (GCS):
  - Input PDFs (temporary, 24hr retention)
  - Output reports (user downloadable, 90-day retention)
  
LangSmith (Observability):
  - Token tracking per document
  - Latency monitoring
  - Cost aggregation
```

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL_OPUS=claude-opus-4-6
CLAUDE_MODEL_SONNET=claude-sonnet-4-6
CLAUDE_MODEL_HAIKU=claude-haiku-4-5-20251001

DATABASE_URL=postgresql+psycopg://[user]:[password]@[host]:[5432]/v2v_prod
PGVECTOR_DIMENSION=1536  # OpenAI embeddings

LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=v2v-decision-deconstructor

GCS_BUCKET=v2v-documents
PDF_RETENTION_HOURS=24

STRIPE_API_KEY=sk_live_...
```

---

## 12. Risk Mitigation

### Hallucination Risk

**Risk:** Agent cites a fake case or misquotes CFR.  
**Mitigation:**
1. HalluGraph verification mandatory before report output
2. Citation Validator MCP server rejects unverified citations
3. Medical opinion QA checklist catches speculative language
4. **Human-in-the-loop:** Professional tier includes attorney review option ($29 add-on)

### Privacy Risk

**Risk:** VA decision contains veteran's personal info (SSN, medical details).  
**Mitigation:**
1. Automatic PII redaction before model processing (email regex, SSN patterns, medical identifiers)
2. Non-training data agreement: Claude API with enterprise retention (0-day by default)
3. PDFs deleted from GCS after 24 hours
4. User research history stored in PostgreSQL with encryption at rest (GCP managed)

### Accuracy Risk

**Risk:** Analysis is wrong; veteran files based on bad recommendation.  
**Mitigation:**
1. Pre-deployment testing suite (see Section 8)
2. Confidence scoring on every recommendation (0-100%)
3. **Disclaimer on every report:** "Not legal advice. Consult an accredited agent or attorney before filing."
4. Monthly eval runs on new BVA decisions (automated benchmarking)

---

## 13. 30-Day Implementation Roadmap

### Week 1: Scaffolding & Agent Design (Days 1-7)

- [ ] Day 1: Infrastructure setup (Cloud Run, PostgreSQL, LangSmith)
- [ ] Day 2-3: LangGraph state schema + agent topology (extract, analyze, verify, synthesize)
- [ ] Day 4: Claude Agent SDK integration + tool definitions (BVA Search, CFR Navigator, Citation Validator)
- [ ] Day 5: MCP server scaffolds (all 4 servers stubbed)
- [ ] Day 6-7: End-to-end agent chain (no QA yet, just plumb the flow)

**Exit criteria:** Full graph executes from PDF input to text output (no refinement)

### Week 2: Extraction & Analysis Agents (Days 8-14)

- [ ] Day 8-9: Extraction Agent tuning (OCR handling, structured field parsing)
- [ ] Day 10-11: CFR/BVA Analysis Agent (build real BVA index, write tool integrations)
- [ ] Day 12-13: Test extraction accuracy on 10 real decisions
- [ ] Day 14: Refine extraction based on test results

**Exit criteria:** Extraction agent achieves 95%+ accuracy on decision structure, CFR agent returns relevant citations

### Week 3: Hallucination Detection & QA (Days 15-21)

- [ ] Day 15-16: Implement HalluGraph verification (knowledge graph extraction + entity grounding)
- [ ] Day 17-18: Implement Citation Validator (lookup in real BVA/CFR DB, check for errors)
- [ ] Day 19: Implement Medical Opinion QA checklist
- [ ] Day 20: Run test suite 2 (synthetic errors detection) — target 95% detection rate
- [ ] Day 21: Refine thresholds based on test results

**Exit criteria:** Hallucination detector catches 95%+ of intentional errors

### Week 4: Integration, Testing & Deployment (Days 22-30)

- [ ] Day 22-23: Full integration testing (5 real VA decisions end-to-end)
- [ ] Day 24: Cost & latency optimization (profile Opus calls, cache CFR sections, optimize retrieval)
- [ ] Day 25: Generate report template & styling
- [ ] Day 26: Deploy to staging (Cloud Run)
- [ ] Day 27-28: Beta testing with 3-5 attorneys/VSOs (gather feedback)
- [ ] Day 29-30: Production deployment + monitoring setup

**Exit criteria:** <60 sec/document, <$0.20/doc cost, 80%+ user satisfaction on usability

---

## 14. Success Metrics (MVP Launch)

| Metric | Target | Why It Matters |
|--------|--------|-----------------|
| **Extraction Accuracy** | ≥95% | Wrong denial basis = wrong advice |
| **Hallucination Detection** | ≥95% on test suite | Legal risk; user trust |
| **Processing Speed** | <60 sec/doc | User experience |
| **Cost per Document** | <$0.20 | Unit economics at $149/mo tier |
| **Uptime** | ≥99.5% | Professional SLA |
| **User Satisfaction** | ≥4.2/5 (NPS ≥40) | Product-market fit signal |
| **Compliance Pass** | ✓ PII redaction, audit logs | Legal liability |

---

## 15. Post-MVP Roadmap (Months 2-3)

Once MVP is stable:

1. **Editorial Engine**: Automate signal detection (Federal Register, court dockets) → Strategy playbooks
2. **Weekly Brief**: Curated M21-1 changes + CAVC trends → email newsletter
3. **Batch Processing**: Professional tier can upload 50 decisions at once (background jobs)
4. **API Access**: Attorneys/VSOs integrate V2V analysis into their workflows
5. **Attorney Research Mode**: Deep-dive CAVC appeal strategy (nested graph for multi-stage appeals)

---

## Conclusion

The Decision Deconstructor is designed as a **professional-grade intelligence tool**, not a chatbot. Every output is grounded in CFR, BVA decisions, and verified legal sources. The architecture uses the latest 2026 patterns: LangGraph stateful orchestration, Claude Agent SDK for reasoning, HalluGraph for hallucination detection, and FACTUM-inspired citation verification.

**This is what displaces "Claim Sharks"—not cheaper pricing, but trustworthy, auditable intelligence that veterans and advocates can actually rely on.**
