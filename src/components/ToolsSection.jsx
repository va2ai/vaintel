import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, BookIcon } from './icons.jsx';

const AI_TOOLS = [
  { name: "BVA Decision Search", desc: "Search thousands of Board decisions by keyword, issue, or outcome.", status: "Live", link: "/bva" },
  { name: "CAVC Case Analyzer", desc: "Detailed breakdowns of Court decisions -- holdings, reasoning, practical impact.", status: "Live" },
  { name: "38 CFR Navigator", desc: "Ask plain-language questions, get the exact regulation sections you need.", status: "Live" },
  { name: "KnowVA / M21-1 Search", desc: "Search VA's adjudication manual to see how raters evaluate your claim type.", status: "Live" },
  { name: "Claims Research Assistant", desc: "AI research system cross-referencing BVA decisions, CAVC precedent, and CFR.", status: "Beta" },
  { name: "Nexus Scout", desc: "Select your primary condition and discover potential secondary claims backed by BVA case evidence.", status: "Live", link: "/nexus-scout" },
];

export function ToolsSection({ onChatOpen, guides, onGuideClick }) {
  const [expandedTool, setExpandedTool] = useState(null);
  const navigate = useNavigate();

  return (
    <>
      {/* RESOURCES */}
      <section id="resources" className="reveal" style={{ padding: "16px var(--pad) 48px", maxWidth: "var(--max-w)", margin: "0 auto" }}>
        <div className="resources-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
          {[
            { img: "/images/resource-claims-process.png", title: "Claims Process Guide", desc: "The full roadmap from Intent to File through Board appeal. Know every step before you take it.", tag: "Step-by-Step", guideId: "filing-first-claim" },
            { img: "/images/resource-cavc-precedent.png", title: "CAVC Precedent Library", desc: "Key Court of Appeals decisions that changed how VA rates claims -- translated into plain English.", tag: "Case Law", guideId: "cavc-precedent-library" },
            { img: "/images/resource-cfr-reference.png", title: "38 CFR Quick Reference", desc: "Jump straight to the regulation that governs your claim type. No more hunting through legal jargon.", tag: "Regulations", guideId: "cfr-quick-reference" },
            { img: "/images/resource-cp-exam.png", title: "C&P Exam Prep Kit", desc: "What to expect, what to bring, and how to make sure the examiner gets the full picture of your condition.", tag: "Exams", guideId: "cp-exam-guide" },
            { img: "/images/resource-rating-calc.png", title: "VA Math Calculator", desc: "Your 30% and 40% don't add up to 70%. Estimate your combined rating using the actual VA formula.", tag: "Ratings", guideId: "va-math" },
            { img: "/images/resource-bva-search.png", title: "BVA Decision Search", desc: "Search thousands of Board decisions by keyword, condition, and outcome. Find the grant patterns that match your claim.", tag: "Research", link: "/bva" },
            { img: "/images/resource-nexus-scout.png", title: "Nexus Scout", desc: "Select your primary condition and discover potential secondary claims with medical rationale and live BVA case evidence.", tag: "Secondary Claims", link: "/nexus-scout" },
          ].map((r, i) => (
            <div key={i} className="resource-card" onClick={() => { if (r.link) navigate(r.link); else if (r.guideId) { const g = guides.find(g => g.id === r.guideId); if (g) onGuideClick(g); } }} style={{ borderRadius: "var(--radius)", border: "1px solid var(--cream-border)", background: "var(--white)", cursor: "pointer", transition: "all 0.25s", overflow: "hidden" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(11,26,46,0.10)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cream-border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ height: 120, background: `linear-gradient(to bottom, rgba(11,26,46,0.3), rgba(11,26,46,0.7)), url(${r.img}) center/cover no-repeat`, position: "relative" }}>
                <span style={{ position: "absolute", top: 10, left: 10, fontFamily: "'JetBrains Mono'", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold-400)", background: "rgba(11,26,46,0.8)", padding: "3px 8px", borderRadius: 4 }}>{r.tag}</span>
              </div>
              <div style={{ padding: "16px 18px 18px" }}>
                <div style={{ fontFamily: "'Lora'", fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>{r.title}</div>
                <div style={{ fontSize: 13, color: "var(--ink-light)", lineHeight: 1.55 }}>{r.desc}</div>
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--gold-600)", display: "flex", alignItems: "center", gap: 4 }}>
                  {r.link ? "Search now" : "Open guide"} <ArrowRight style={{ width: 12, height: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI TOOLS */}
      <section id="ai-tools" className="reveal" style={{ padding: "48px var(--pad)", background: "var(--navy-900)", color: "var(--white)" }}>
        <div style={{ maxWidth: "var(--max-w)", margin: "0 auto" }}>
          <div className="ai-tools-layout">
          <div>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-400)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>AI-Powered Research</div>
            <h2 style={{ fontFamily: "'Lora'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Research Tools</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 24, maxWidth: 500 }}>Professional-grade claims intelligence tools for searching BVA decisions, CAVC precedent, VA regulations, and adjudication guidance.</p>
          </div>
          <div className="ai-tools-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {AI_TOOLS.map((tool, i) => (
              <div key={i} onClick={() => setExpandedTool(expandedTool === i ? null : i)} style={{ padding: "16px 20px", borderRadius: "var(--radius)", border: "1px solid", borderColor: expandedTool === i ? "var(--gold-500)" : "rgba(255,255,255,0.1)", background: expandedTool === i ? "rgba(255,255,255,0.05)" : "transparent", cursor: "pointer", transition: "all 0.2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{tool.name}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontFamily: "'JetBrains Mono'", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", background: tool.status === "Live" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: tool.status === "Live" ? "#22c55e" : "#eab308", border: `1px solid ${tool.status === "Live" ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`, display: "inline-flex", alignItems: "center", gap: 4, minHeight: "auto" }}>
                      {tool.status === "Live" && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />}{tool.status}
                    </span>
                  </div>
                  <div style={{ transform: expandedTool === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", color: "var(--ink-muted)" }}><ChevronDown /></div>
                </div>
                {expandedTool === i && (<p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginTop: 10, animation: "fadeIn 0.2s ease-out" }}>{tool.desc}</p>)}
              </div>
            ))}
          </div>
          </div>
          <button onClick={onChatOpen} style={{ marginTop: 24, background: "var(--gold-500)", border: "none", padding: "14px 28px", borderRadius: 8, fontWeight: 700, fontSize: 15, color: "var(--navy-900)", cursor: "pointer", fontFamily: "'Source Sans 3'", gap: 8, justifyContent: "center", width: "100%" }}>
            Try the Research Assistant <ArrowRight />
          </button>
        </div>
      </section>
    </>
  );
}
