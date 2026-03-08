# Decision Deconstructor MVP: Executive Summary

## Overview

This package contains a **complete architecture assessment** and **30-day implementation roadmap** for V2V's Decision Deconstructor wedge product—a professional-grade AI system that analyzes VA disability claim denials and appeals with evidence-based, legally-grounded intelligence.

**Core Value Proposition:**  
Transform a 15-page VA denial into a 5-minute analysis that identifies evidence gaps, recommends the correct filing lane (Supplemental Claim vs. HLR vs. CAVC Appeal), and prevents veterans from filing speculative claims. Priced at $149/mo for professionals (attorneys, VSOs, advocates) vs. $1,250/hr for human claim "sharks."

---

## What's Included

### 1. **Architecture Assessment** (`decision_deconstructor_architecture.md`)
   - **15 sections** covering the full technical stack
   - Framework selection (LangGraph + Claude Agent SDK + HalluGraph)
   - Multi-agent topology with model routing (Haiku → Sonnet → Opus)
   - MCP servers for BVA/CFR tool integration
   - **Hallucination detection** using knowledge graph alignment (3-pillar defense)
   - Data layer design (PostgreSQL + pgvector indexing)
   - Frontend flows and API endpoints
   - Risk mitigation (privacy, accuracy, legal liability)

**Key Technical Decisions:**
- **LangGraph** for stateful orchestration (checkpoints, rollback, audit trails)
- **Claude Opus 4.5** for the analysis agent (complex CFR/BVA reasoning)
- **HalluGraph** framework for verifying entity grounding & relation preservation
- **Citation Validator** MCP server (every case reference fact-checked)
- **Medical Opinion Rigor Checker** (detects speculative language)

**Cost Model:**
- Input: ~10K tokens (PDF + context)
- Output: ~5K tokens (analysis + report)
- **~$0.16/document at professional tier ($149/mo = 900 docs included)**

---

### 2. **30-Day Sprint Blueprint** (`decision_deconstructor_30day_sprint.md`)
   - **Daily standups** with exit criteria for all 30 days
   - **Week-by-week breakdown:**
     - Week 1: Scaffolding & LangGraph state design
     - Week 2: Extraction & CFR analysis agents
     - Week 3: Hallucination detection QA
     - Week 4: Integration testing & production deploy
   - **Test suites** (extraction accuracy, hallucination detection, strategy alignment)
   - **Detailed code examples** (Pydantic schemas, agent functions, MCP servers)
   - **Optimization targets** (<60 sec/doc, <$0.20/doc)

**Success Criteria at Launch:**
- Extraction accuracy ≥95%
- Hallucination detection ≥95% on synthetic errors
- Processing speed <60 seconds/document
- Unit cost <$0.20/document
- Beta tester NPS ≥40

---

## Why This Architecture Wins

### 1. **Hallucination Defense (3-Pillar)**
   - **Pillar 1:** Knowledge graph verification (HalluGraph pattern) — verify entity grounding & relations
   - **Pillar 2:** Citation fact-checking (FACTUM pattern) — every case reference validated against BVA index
   - **Pillar 3:** Medical opinion rigor check — detects "probably" vs. "at least as likely as not"
   
   **Result:** Even if Claude hallucinates, the QA layer catches it. Flags for human review. Prevents malpractice liability.

### 2. **Evidence-Based Analysis**
   - Every recommendation is grounded in 38 CFR, BVA decisions, and M21-1 manual
   - Not a chatbot; is an **intelligence platform** with audit trails
   - Comparable BVA decisions surface success rates (e.g., "62% of similar claims grant with Supplemental Claim")

### 3. **Professional Grade**
   - Stateful graph execution (if processing fails at step 3, resume from step 3, don't restart)
   - Full audit trail (every model call logged, token usage tracked, reasoning captured)
   - PII redaction (automatic scrubbing before Claude processes sensitive data)
   - Non-training data agreement (Claude API with 0-day retention)

### 4. **Cost Discipline**
   - Right model for each task (Haiku for classification, Sonnet for mid-tier, Opus for complex reasoning)
   - Prompt caching (system prompts + tool definitions cached at 10% cost)
   - Achieves <$0.20/doc at scale (vs. human at $1,250/hr = $100+/doc)

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Claude hallucinates CFR citations | HalluGraph verification + Citation Validator MCP server; flags for human review |
| Veterans misuse AI output as legal advice | Prominent disclaimer on every report; "Not legal advice" watermark |
| PII leaks (SSN, medical details in PDF) | Automatic redaction regex before Claude processing; non-training data agreement |
| Analysis is wrong; veteran files based on bad recommendation | Pre-deploy test suite (10 real decisions ≥90% accuracy); monthly eval runs on new BVA decisions |
| Slow processing (users wait >60 sec) | Latency optimization (prompt caching, parallelization, Batch API for background jobs) |

---

## Quick Timeline

**Week 1:** Scaffolding & LangGraph setup  
**Week 2:** Core agents (extraction, CFR/BVA analysis)  
**Week 3:** QA/hallucination detection  
**Week 4:** Testing, beta, production deploy  

**Effort:** ~170 hours (1 engineer FTE for 30 days)  
**Cost:** ~$400 (GCP + Claude API + LangSmith)

---

## Post-MVP Roadmap (Months 2-3)

Once MVP is stable:

1. **Editorial Engine** — Signal detection (Federal Register, court dockets) → auto-generated strategy playbooks
2. **Weekly Brief** — Curated M21-1 changes + CAVC trends → email newsletter (trust-building)
3. **Batch Processing** — Professional tier: upload 50 decisions at once (background jobs)
4. **API Access** — Attorneys/VSOs integrate V2V analysis into their workflows
5. **Attorney Research Mode** — Deep-dive CAVC appeal strategy (multi-stage appeal graph)

---

## How to Use This Package

### For Technical Leads:
1. Read `decision_deconstructor_architecture.md` **Section 1-7** (system design, frameworks, agent topology)
2. Reference **Section 8-15** for QA, deployment, and risk mitigation
3. Use as basis for code review checklist & tech debt tracking

### For Engineering Team:
1. Follow `decision_deconstructor_30day_sprint.md` as your daily standup guide
2. Each day has clear exit criteria—track completion in your project board
3. Run tests at section boundaries (Day 7, 14, 21, 30) to validate gates
4. Optimize using the cost/latency profiler (Day 24)

### For Product/Go-to-Market:
1. Reference **commercialization strategy** document you provided (the "big picture")
2. Decision Deconstructor is your **wedge product** — it displaces "Claim Sharks" by offering evidence-based analysis at 1/10 the cost
3. Launch with Professional tier ($149/mo, minimum 3-6 month commitment expected)
4. Free utilities (BVA Search, CFR Navigator) drive top-of-funnel; convert to Pro/Professional via Weekly Brief newsletter
5. Beta testers: 3-5 accredited agents/attorneys (you know these people; ask for early feedback before GA launch)

### For Legal/Compliance:
1. Review **Risk Mitigation** section (Section 12 in architecture doc)
2. Ensure PII redaction workflow (automatic + manual spot checks)
3. Monitor hallucination detection results monthly (keep reports in audit log)
4. Require disclaimer on every report: "Not legal advice. Not affiliated with VA."

---

## Key Decisions Baked Into This Design

**✓ Use LangGraph (not CrewAI or OpenAI SDK)**
- Stateful orchestration with checkpoints
- Complex conditional routing (different CFR paths for different conditions)
- Full audit trail (who-did-what-when)
- Mature, used by enterprise AI teams

**✓ Use Claude Opus for the analysis agent**
- VA claims require deep reasoning (cross-reference CFR, identify precedent, synthesize strategy)
- Opus 4.5 is 67% cheaper than Opus 4.1; worth the cost for complex reasoning
- Other agents use Sonnet/Haiku (cost discipline)

**✓ Use HalluGraph pattern for hallucination detection**
- Knowledge graph alignment is production-proven (Stanford 2025 research)
- Better than semantic similarity alone (catches entity substitutions)
- Works well for legal documents (dense entity networks)

**✓ Build internal MCP servers (not API calls)**
- Decouples agents from tool implementation
- Standardized tool interface (Linux Foundation standard)
- Easy to test agents independently

**✓ Deploy to Cloud Run (not Lambda)**
- Stateful sessions (PostgreSQL connections, LangGraph state)
- Long timeouts (up to 3,600 sec, PDFs take 60 sec)
- Cost-effective at V2V scale

---

## What's NOT Included (Out of Scope for MVP)

- ❌ Editorial Engine (signal detection, newsroom automation) — Phase 2
- ❌ Batch processing UI — Phase 2
- ❌ API for attorneys — Phase 2
- ❌ Multi-language support — Phase 3+
- ❌ Mobile app — Phase 3+
- ❌ Real-time collaboration (multiple users per document) — Phase 3+

**Focus:** Get Decision Deconstructor wedge working flawlessly. Launch, gather feedback, iterate. Then expand.

---

## Success Looks Like (30 Days In)

✓ Product ships to production  
✓ 3-5 beta testers actively using it  
✓ NPS ≥40 (they'd recommend to colleagues)  
✓ Processing <60 sec/document  
✓ Cost <$0.20/document  
✓ Zero PII leaks in production  
✓ Audit trail complete (fully traceable)  
✓ Team is confident to market it  

---

## Questions?

This design is **production-ready** — every section has been thought through. But it's also **flexible** — adjust based on your constraints (team size, timeline, budget).

Key things to validate before starting:
1. Can you access BVA decision data (public VA appeals DB)?
2. Do you have 1 engineer FTE for 30 days?
3. Are you authorized to process veteran PII (non-training agreement with Claude)?
4. Do you have 3-5 beta testers lined up?

If all 4 are yes, you're ready to execute this sprint. 

**Go build something that displaces predatory "Claim Sharks." This is how V2V becomes market authority.**

---

**Document Version:** 1.0  
**Last Updated:** March 8, 2026  
**Maintained By:** Chris Combs (Veteran 2 Veteran LLC)  
**Status:** Ready for implementation
