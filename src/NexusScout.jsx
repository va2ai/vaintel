import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ── PDF report file map ──────────────────────────────────────────
const REPORT_FILES = {
  "PTSD": "01-ptsd.pdf",
  "Tinnitus": "02-tinnitus.pdf",
  "Lumbar Spine (Low Back)": "03-lumbar-spine-low-back.pdf",
  "Knee Condition": "04-knee-condition.pdf",
  "Hearing Loss": "05-hearing-loss.pdf",
  "Migraines": "06-migraines.pdf",
  "Cervical Spine (Neck)": "07-cervical-spine-neck.pdf",
  "Shoulder Condition": "08-shoulder-condition.pdf",
  "Sleep Apnea": "09-sleep-apnea.pdf",
  "Flat Feet (Pes Planus)": "10-flat-feet-pes-planus.pdf",
};
const FULL_GUIDE = "nexus-scout-evidence-guide.pdf";

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ── Icons ────────────────────────────────────────────────────────
const ArrowLeft = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const ArrowRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
);
const Spinner = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);
const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ── Strength badge ───────────────────────────────────────────────
const STRENGTH = {
  strong:   { bg: "rgba(34,197,94,0.12)", color: "#16a34a", border: "rgba(34,197,94,0.3)", label: "Strong Link" },
  moderate: { bg: "rgba(234,179,8,0.12)",  color: "#ca8a04", border: "rgba(234,179,8,0.3)",  label: "Moderate Link" },
  emerging: { bg: "rgba(59,130,246,0.12)", color: "#2563eb", border: "rgba(59,130,246,0.3)", label: "Emerging Link" },
};

function StrengthBadge({ strength }) {
  const s = STRENGTH[strength] || STRENGTH.moderate;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 4, background: s.bg, border: `1px solid ${s.border}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: s.color, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// ── CSS ──────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --navy-900: #0B1A2E; --navy-800: #0F2240; --navy-700: #15305A; --navy-600: #1C3E72;
    --gold-500: #C8A232; --gold-400: #D9B844; --gold-300: #E8CC6A;
    --cream: #FAFAF5; --cream-warm: #F5F2EA; --cream-border: #E8E4D8;
    --ink: #1A1D26; --ink-light: #4A4D5A; --ink-muted: #8A8D9A;
    --white: #ffffff; --radius: 10px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Source Sans 3', -apple-system, sans-serif; background: var(--cream); color: var(--ink); }
  ::selection { background: rgba(200,162,50,0.25); }
  button, a { min-height: 44px; display: inline-flex; align-items: center; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes dotPulse { 0%,60%,100% { opacity:.3; } 30% { opacity:1; } }

  .ns-layout { display: grid; grid-template-columns: 280px 1fr 380px; gap: 0; min-height: 100vh; }
  .ns-sidebar { background: var(--navy-900); padding: 0; display: flex; flex-direction: column; }
  .ns-center { padding: 28px 24px; overflow-y: auto; }
  .ns-evidence { background: var(--white); border-left: 1px solid var(--cream-border); padding: 0; overflow-y: auto; }

  .ns-card {
    border: 1px solid var(--cream-border); border-radius: var(--radius); padding: 18px 20px;
    background: var(--white); cursor: pointer; transition: all 0.2s;
  }
  .ns-card:hover { border-color: var(--gold-500); box-shadow: 0 4px 16px rgba(11,26,46,0.08); }
  .ns-card.active { border-color: var(--gold-500); background: var(--cream-warm); box-shadow: 0 4px 16px rgba(11,26,46,0.08); }

  @media (max-width: 1024px) {
    .ns-layout { grid-template-columns: 240px 1fr; }
    .ns-evidence { display: none; }
    .ns-evidence.mobile-show { display: block; position: fixed; inset: 0; z-index: 200; border: none; animation: slideUpEvidence 0.3s ease-out; }
  }
  @media (max-width: 768px) {
    .ns-layout { grid-template-columns: 1fr; }
    .ns-sidebar { position: relative; }
    .ns-evidence.mobile-show { display: block; position: fixed; inset: 0; z-index: 200; border: none; animation: slideUpEvidence 0.3s ease-out; }
  }
  @keyframes slideUpEvidence { from { transform: translateY(100%); } to { transform: translateY(0); } }
`;

// ── Main Component ───────────────────────────────────────────────
export default function NexusScout() {
  const [data, setData] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [selectedSecondary, setSelectedSecondary] = useState(null);
  const [mobileEvidence, setMobileEvidence] = useState(false);
  const navigate = useNavigate();

  // Load condition data
  useEffect(() => {
    fetch("/nexus-scout-data.json")
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.conditions?.length) setSelectedCondition(d.conditions[0]);
      })
      .catch(() => {});
  }, []);

  const handleSelectSecondary = useCallback((sec) => {
    setSelectedSecondary(sec);
    setMobileEvidence(true);
  }, []);

  const handleResearchWithAI = useCallback(() => {
    if (!selectedSecondary || !selectedCondition) return;
    const query = `I have service-connected ${selectedCondition.name}. Help me research a secondary claim for ${selectedSecondary.name}. ${selectedSecondary.relationship}`;
    window.__nexusScoutQuery = query;
    navigate("/");
  }, [selectedSecondary, selectedCondition, navigate]);

  const secondaries = selectedCondition?.secondaries || [];

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--cream)" }}>
        <style>{css}</style>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <>
      <style>{css}</style>

      <div className="ns-layout">
        {/* ── PANEL A: Sidebar / Condition Selector ── */}
        <div className="ns-sidebar">
          {/* Header */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontFamily: "'Source Sans 3'", gap: 6, padding: 0, marginBottom: 16, minHeight: "auto" }}>
              <ArrowLeft size={12} /> Back to V2V
            </button>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-400)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold-500)", animation: "dotPulse 2s infinite" }} />
                Nexus Scout
              </span>
            </div>
            <h1 style={{ fontFamily: "'Lora'", fontSize: 22, fontWeight: 700, color: "var(--white)", lineHeight: 1.2, marginBottom: 6 }}>
              Discover Secondary Connections
            </h1>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              Select your primary condition to find potential secondary claims with downloadable evidence reports.
            </p>
          </div>

          {/* Condition dropdown */}
          <div style={{ padding: "16px 20px" }}>
            <label style={{ fontFamily: "'JetBrains Mono'", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
              Primary Condition
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedCondition?.id || ""}
                onChange={e => {
                  const c = data.conditions.find(c => c.id === e.target.value);
                  setSelectedCondition(c);
                  setSelectedSecondary(null);
                }}
                style={{
                  width: "100%", padding: "12px 36px 12px 14px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)",
                  color: "var(--white)", fontSize: 15, fontFamily: "'Source Sans 3'", fontWeight: 600,
                  cursor: "pointer", appearance: "none", outline: "none",
                }}
              >
                {data.conditions.map(c => (
                  <option key={c.id} value={c.id} style={{ background: "var(--navy-900)", color: "var(--white)" }}>{c.name}</option>
                ))}
              </select>
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.4)" }}>
                <ChevronDown />
              </div>
            </div>
          </div>

          {/* Condition info card */}
          {selectedCondition && (
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ padding: "14px 16px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-400)", background: "rgba(200,162,50,0.15)", padding: "2px 8px", borderRadius: 4 }}>
                    DC {selectedCondition.dc}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4 }}>
                    {selectedCondition.cfr}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                  {selectedCondition.prevalence}
                </p>
              </div>
            </div>
          )}

          {/* Count */}
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>
              {secondaries.length} secondary connection{secondaries.length !== 1 ? "s" : ""} found
            </div>
          </div>

          {/* Download Reports */}
          {selectedCondition && (
            <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <a href={`/reports/${REPORT_FILES[selectedCondition.name] || FULL_GUIDE}`} download
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(200,162,50,0.12)", border: "1px solid rgba(200,162,50,0.25)", color: "var(--gold-400)", fontSize: 12, fontWeight: 600, fontFamily: "'Source Sans 3'", textDecoration: "none", cursor: "pointer" }}>
                <DownloadIcon /> {selectedCondition.name} Report (PDF)
              </a>
              <a href={`/reports/${FULL_GUIDE}`} download
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "'Source Sans 3'", textDecoration: "none", cursor: "pointer" }}>
                <DownloadIcon /> Full Guide - All 10 Conditions
              </a>
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Disclaimer */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1.5, fontFamily: "'Source Sans 3'" }}>
              This tool provides research information only. It is not legal or medical advice. Consult a qualified attorney or VSO for claim strategy.
            </p>
          </div>
        </div>

        {/* ── PANEL B: Secondary Conditions List ── */}
        <div className="ns-center">
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Lora'", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
              Secondary Conditions
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-muted)" }}>
              Click a condition to view the evidence report.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {secondaries.map((sec, i) => (
              <div
                key={sec.id}
                className={`ns-card${selectedSecondary?.id === sec.id ? " active" : ""}`}
                onClick={() => handleSelectSecondary(sec)}
                style={{ animation: `fadeUp 0.3s ease-out ${i * 0.06}s both` }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <h3 style={{ fontFamily: "'Lora'", fontSize: 17, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                    {sec.name}
                  </h3>
                  <StrengthBadge strength={sec.strength} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-500)", background: "rgba(200,162,50,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                    DC {sec.dc}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--ink-muted)", background: "var(--cream)", padding: "2px 8px", borderRadius: 4 }}>
                    {sec.cfr}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-light)", lineHeight: 1.6 }}>
                  {sec.relationship}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600, color: "var(--gold-500)" }}>
                  View Report <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PANEL C: Evidence Panel ── */}
        <div className={`ns-evidence${mobileEvidence ? " mobile-show" : ""}`}>
          {!selectedSecondary ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 32, textAlign: "center" }}>
              <div>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <LinkIcon />
                </div>
                <p style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.6 }}>
                  Select a secondary condition to view the evidence report.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Mobile close */}
              <div className="ns-mobile-close" style={{ display: "none" }}>
                <button onClick={() => setMobileEvidence(false)} style={{ width: "100%", padding: "12px 20px", background: "var(--navy-900)", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'Source Sans 3'", cursor: "pointer", gap: 6, justifyContent: "center" }}>
                  <ArrowLeft size={12} /> Back to conditions
                </button>
              </div>
              <style>{`@media (max-width: 1024px) { .ns-mobile-close { display: block !important; } }`}</style>

              {/* Header */}
              <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid var(--cream-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <StrengthBadge strength={selectedSecondary.strength} />
                </div>
                <h3 style={{ fontFamily: "'Lora'", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                  {selectedSecondary.name}
                </h3>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-500)", background: "rgba(200,162,50,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                    DC {selectedSecondary.dc}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--ink-muted)", background: "var(--cream)", padding: "2px 8px", borderRadius: 4 }}>
                    {selectedSecondary.cfr}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "var(--ink-light)", lineHeight: 1.6 }}>
                  {selectedSecondary.relationship}
                </p>
              </div>

              {/* PDF Report Embed */}
              <div style={{ flex: 1, padding: "0 24px 16px", display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-500)", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                  Evidence Report
                </div>
                <iframe
                  src={`/reports/${REPORT_FILES[selectedCondition?.name] || FULL_GUIDE}`}
                  style={{ flex: 1, minHeight: 400, width: "100%", border: "1px solid var(--cream-border)", borderRadius: 8 }}
                  title={`${selectedCondition?.name} Evidence Report`}
                />
              </div>

              {/* CTAs */}
              <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                <a href={`/reports/${REPORT_FILES[selectedCondition?.name] || FULL_GUIDE}`} download
                  style={{ width: "100%", padding: "12px 20px", borderRadius: 8, background: "var(--navy-900)", border: "none", color: "var(--gold-400)", fontSize: 14, fontWeight: 600, fontFamily: "'Source Sans 3'", cursor: "pointer", gap: 8, justifyContent: "center", textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", boxSizing: "border-box" }}>
                  <DownloadIcon /> Download {selectedCondition?.name} Report (PDF)
                </a>
                <button onClick={handleResearchWithAI} style={{ width: "100%", padding: "12px 20px", borderRadius: 8, background: "transparent", border: "1px solid var(--cream-border)", color: "var(--ink-light)", fontSize: 14, fontWeight: 600, fontFamily: "'Source Sans 3'", cursor: "pointer", gap: 8, justifyContent: "center" }}>
                  <SearchIcon /> Research with AI
                </button>
                <a href={`/reports/${FULL_GUIDE}`} download
                  style={{ width: "100%", padding: "10px 20px", borderRadius: 8, background: "transparent", border: "none", color: "var(--ink-muted)", fontSize: 12, fontFamily: "'Source Sans 3'", cursor: "pointer", textDecoration: "underline", textAlign: "center", display: "block" }}>
                  Download Full 29-Page Guide (All 10 Conditions)
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

    </>
  );
}
