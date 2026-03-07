import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const API = "https://bva-api-301313738047.us-central1.run.app";

// ── Text cleaning (strip BOM + encoding artifacts) ───────────────
function cleanText(text) {
  if (!text) return text;
  return text
    .replace(/^\uFEFF/, "")           // UTF-8 BOM
    .replace(/^\xEF\xBB\xBF/, "")     // UTF-8 BOM as raw bytes
    .replace(/^\xFF\xFE/, "")          // UTF-16 LE BOM as raw bytes
    .replace(/^\xFE\xFF/, "")          // UTF-16 BE BOM as raw bytes
    .replace(/^\u00FF\u00FE/, "")      // UTF-16 LE BOM decoded as Latin-1
    .replace(/^\u00FE\u00FF/, "")      // UTF-16 BE BOM decoded as Latin-1
    .replace(/\u0000/g, "")            // null bytes from UTF-16
    .replace(/\r\n/g, "\n")            // normalize line endings
    .trim();
}

function normalizeWhitespace(text) {
  return cleanText(text || "")?.replace(/\s+/g, " ").trim() || "";
}

function formatDisplayDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return normalizeWhitespace(String(value));
}

function cleanDocketNumber(value) {
  if (!value) return null;
  return normalizeWhitespace(String(value).replace(/\bDATE\b.*$/i, "").replace(/\s{2,}/g, " "));
}

function cleanLabelText(value) {
  return normalizeWhitespace(String(value || "").replace(/^Citation Nr:\s*/i, ""));
}

function isPlaceholderTitle(title, caseNumber) {
  const cleanTitle = cleanLabelText(title);
  const cleanCase = cleanLabelText(caseNumber);
  return !cleanTitle || cleanTitle === cleanCase || /^[A-Z]?\d{6,}$/i.test(cleanTitle);
}

function extractHeadlineFromText(text) {
  const normalized = normalizeWhitespace(text).replace(/\.\.\./g, " ");
  if (!normalized) return null;
  const patterns = [
    /ORDER\s+([^.!?]+[.!?])/i,
    /(Entitlement to [^.?!]+[.?!])/i,
    /(Service connection for [^.?!]+[.?!])/i,
    /(An? (?:initial |increased )?(?:rating|evaluation) for [^.?!]+[.?!])/i,
    /(TDIU[^.?!]*[.?!])/i,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return normalized.split(/(?<=[.?!])\s+/)[0]?.trim() || null;
}

function formatHeadline(text) {
  if (!text) return null;
  let cleaned = text.replace(/\s+/g, " ").replace(/\.\.\./g, "").trim();
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, "$1");
  cleaned = cleaned.replace(/^(.)/, (m) => m.toUpperCase());
  return cleaned;
}

function extractDispositionSentence(text) {
  const normalized = normalizeWhitespace(text).replace(/\.\.\./g, " ");
  if (!normalized) return null;
  const match = normalized.match(/(Entitlement to .*?\b(?:is|are)\s+(?:granted|denied|remanded|dismissed|reopened))/i);
  if (match?.[1]) return `${match[1].trim()}.`;
  return null;
}

function buildResultTitle(result) {
  if (!isPlaceholderTitle(result.title, result.case_number)) return cleanLabelText(result.title);
  const disposition = formatHeadline(extractDispositionSentence(result.snippet));
  if (disposition) return disposition;
  const derived = formatHeadline(extractHeadlineFromText(result.snippet));
  if (derived && derived.length >= 24 && !/^[\W(]/.test(derived)) return derived;
  return cleanLabelText(result.case_number) || "BVA Decision";
}

function buildResultSnippet(result) {
  const raw = normalizeWhitespace(result.snippet);
  if (!raw) return "";
  const headline = buildResultTitle(result);
  let snippet = raw.replace(/\.\.\./g, " ").trim();
  if (headline && snippet.toLowerCase().startsWith(headline.toLowerCase())) {
    snippet = snippet.slice(headline.length).trim();
  }
  return snippet.replace(/^\W+/, "").trim();
}

function normalizeIssues(issues, fallbackText) {
  const cleaned = (issues || [])
    .map((issue) => normalizeWhitespace(issue))
    .filter(Boolean)
    .filter((issue) => issue.length <= 220)
    .filter((issue) => !/^[,.;:]/.test(issue));
  if (cleaned.length) return cleaned;

  const fallback = formatHeadline(extractHeadlineFromText(fallbackText));
  return fallback ? [fallback] : [];
}

function getCaseDisplayFields(activeCase) {
  const headline = formatHeadline(extractHeadlineFromText(activeCase.text_preview)) || cleanLabelText(activeCase.case_number) || "BVA Decision";
  const docket = cleanDocketNumber(activeCase.docket_no);
  const decisionDate = formatDisplayDate(activeCase.decision_date);
  const issues = normalizeIssues(activeCase.issues, activeCase.text_preview);
  const judge = normalizeWhitespace(activeCase.judge);
  return {
    headline,
    docket,
    decisionDate,
    issues,
    judge: judge && !/^Board of Veterans$/i.test(judge) ? judge : null,
  };
}

// ── Icons ────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
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
const GavelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2l5 5-7 7-5-5z" /><path d="M9.5 12L4 17.5" /><path d="M2 22l3-3" /><path d="M18 13l4 4" />
  </svg>
);
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
);
const ExternalIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);
const Spinner = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
  </svg>
);

// ── Outcome badge ────────────────────────────────────────────────
function OutcomeBadge({ outcome }) {
  if (!outcome) return null;
  const o = outcome.toLowerCase();
  let bg = "var(--cream-warm)", color = "var(--ink-light)", border = "var(--cream-border)";
  if (o.includes("grant") || o.includes("allowed")) { bg = "#e8f5e9"; color = "#2e7d32"; border = "#c8e6c9"; }
  else if (o.includes("denied") || o.includes("deny")) { bg = "#fbe9e7"; color = "#c62828"; border = "#ffccbc"; }
  else if (o.includes("remand")) { bg = "#fff8e1"; color = "#f57f17"; border = "#ffecb3"; }
  return (
    <span style={{ padding: "3px 10px", borderRadius: 4, background: bg, border: `1px solid ${border}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {outcome}
    </span>
  );
}

// ── Parse snippet into segments (text + highlighted) ─────────────
function parseSnippet(html) {
  if (!html) return [];
  // The API uses \ue000 / \ue001 as highlight markers, and sometimes <strong>
  const normalized = html
    .replace(/<strong>/gi, "\ue000").replace(/<\/strong>/gi, "\ue001")
    .replace(/<[^>]+>/g, ""); // strip all other HTML tags
  const parts = [];
  let remaining = normalized;
  while (remaining.length > 0) {
    const start = remaining.indexOf("\ue000");
    if (start === -1) {
      parts.push({ text: remaining, highlight: false });
      break;
    }
    if (start > 0) parts.push({ text: remaining.slice(0, start), highlight: false });
    const end = remaining.indexOf("\ue001", start);
    if (end === -1) {
      parts.push({ text: remaining.slice(start + 1), highlight: false });
      break;
    }
    parts.push({ text: remaining.slice(start + 1, end), highlight: true });
    remaining = remaining.slice(end + 1);
  }
  return parts;
}

function Snippet({ html }) {
  const parts = useMemo(() => parseSnippet(html), [html]);
  if (!parts.length) return null;
  return (
    <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-light)" }}>
      {parts.map((p, i) =>
        p.highlight
          ? <mark key={i} style={{ background: "rgba(200,162,50,0.25)", padding: "0 2px", borderRadius: 2 }}>{p.text}</mark>
          : <span key={i}>{p.text}</span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
export default function BvaSearch() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [years, setYears] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activeCase, setActiveCase] = useState(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [spelling, setSpelling] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/years`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setYears(data.sort((a, b) => b - a));
    }).catch(() => {});
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q, y, p) => {
    if (!q.trim()) return;
    setLoading(true);
    setSpelling(null);
    try {
      const params = new URLSearchParams({ q: q.trim(), page: p });
      if (y) params.set("year", y);
      const res = await fetch(`${API}/search?${params}`);
      const data = await res.json();
      if (data.results) {
        data.results = data.results.map(r => ({
          ...r,
          snippet: r.snippet ? cleanText(r.snippet) : r.snippet,
          title: r.title ? cleanText(r.title) : r.title,
        }));
      }
      setResults(data);
      if (data.spelling_correction) setSpelling(data.spelling_correction);
    } catch (e) {
      setResults({ error: e.message, results: [], total: 0 });
    }
    setLoading(false);
  }, []);

  const handleSearch = (e) => {
    e?.preventDefault();
    setPage(1);
    setActiveCase(null);
    doSearch(query, year, 1);
  };

  const handlePage = (newPage) => {
    setPage(newPage);
    doSearch(query, year, newPage);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const openCase = async (url) => {
    setCaseLoading(true);
    setShowFullText(false);
    try {
      const res = await fetch(`${API}/case?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.text_preview) data.text_preview = cleanText(data.text_preview);
      if (data.full_text) data.full_text = cleanText(data.full_text);
      setActiveCase(data);
    } catch (e) {
      setActiveCase({ error: e.message });
    }
    setCaseLoading(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const loadFullText = async () => {
    if (!activeCase?.url) return;
    setShowFullText("loading");
    try {
      const res = await fetch(`${API}/case?url=${encodeURIComponent(activeCase.url)}&full_text=true`);
      const data = await res.json();
      setActiveCase(prev => ({ ...prev, full_text: cleanText(data.full_text) }));
      setShowFullText(true);
    } catch {
      setShowFullText(false);
    }
  };

  const totalPages = results ? Math.ceil(results.total / (results.per_page || 20)) : 0;
  const caseDisplay = activeCase ? getCaseDisplayFields(activeCase) : null;

  // ── Case Detail View ────────────────────────────────────────────
  if (activeCase && !activeCase.error) {
    return (
      <>
        <style>{globalCSS}</style>
        <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
          <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(250,250,245,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--cream-border)", padding: "0 var(--pad)" }}>
            <div style={{ maxWidth: 960, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => setActiveCase(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--navy-700)", fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, fontWeight: 600, gap: 6, padding: "8px 0" }}>
                <ArrowLeft size={16} /> Back to Results
              </button>
              <a href={activeCase.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ink-muted)", gap: 4, textDecoration: "none" }}>
                Source <ExternalIcon />
              </a>
            </div>
          </nav>

          <article style={{ maxWidth: 960, margin: "0 auto", padding: "32px var(--pad) 80px", animation: "fadeUp 0.4s ease-out" }}>
            {/* Case header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--gold-500)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
                  {cleanLabelText(activeCase.case_number) || "BVA Decision"}
                </span>
                {caseDisplay.decisionDate && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ink-muted)" }}>{caseDisplay.decisionDate}</span>
                )}
                <OutcomeBadge outcome={activeCase.outcome} />
              </div>
              <h1 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 700, lineHeight: 1.25, color: "var(--ink)", marginBottom: 8 }}>
                {caseDisplay.headline}
              </h1>
              {caseDisplay.docket && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ink-muted)", letterSpacing: "0.04em" }}>
                  Docket No. {caseDisplay.docket}
                </div>
              )}
            </div>

            {/* Metadata grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--cream-border)" }}>
              {[
                ["Citation", cleanLabelText(activeCase.case_number)],
                ["Judge", caseDisplay.judge],
                ["Decision Date", caseDisplay.decisionDate],
                ["Regional Office", activeCase.regional_office],
                ["Year", activeCase.year],
                ["Text Length", activeCase.text_length ? `${(activeCase.text_length / 1000).toFixed(1)}K chars` : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ padding: "12px 16px", background: "var(--cream-warm)", borderRadius: 8, border: "1px solid var(--cream-border)" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--ink-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Issues */}
            {caseDisplay.issues?.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Issues</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {caseDisplay.issues.map((issue, i) => (
                    <span key={i} style={{ padding: "6px 14px", borderRadius: 6, background: "var(--navy-900)", color: "var(--gold-400)", fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{issue}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {activeCase.citations?.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Citations</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeCase.citations.map((cite, i) => (
                    <span key={i} style={{ padding: "4px 10px", borderRadius: 4, background: "var(--cream-warm)", border: "1px solid var(--cream-border)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ink-light)" }}>{cite}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Text preview / full text */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>Decision Text</h3>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ink-muted)", marginBottom: 10, letterSpacing: "0.04em" }}>
                Preview
              </div>
              {showFullText === true && activeCase.full_text ? (
                <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, lineHeight: 1.8, color: "var(--ink-light)", whiteSpace: "pre-wrap", background: "var(--white)", border: "1px solid var(--cream-border)", borderRadius: 8, padding: 24, maxHeight: 600, overflow: "auto" }}>
                  {activeCase.full_text}
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, lineHeight: 1.8, color: "var(--ink-light)", background: "var(--white)", border: "1px solid var(--cream-border)", borderRadius: 8, padding: 24 }}>
                    {activeCase.text_preview}
                  </div>
                  <button onClick={loadFullText} disabled={showFullText === "loading"} style={{
                    marginTop: 12, padding: "10px 20px", borderRadius: 8,
                    background: showFullText === "loading" ? "var(--cream-warm)" : "var(--navy-900)",
                    color: showFullText === "loading" ? "var(--ink-muted)" : "var(--gold-400)",
                    border: "none", cursor: showFullText === "loading" ? "default" : "pointer",
                    fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, fontWeight: 600, gap: 8
                  }}>
                    {showFullText === "loading" ? <><Spinner /> Loading full text...</> : "Load full decision text"}
                  </button>
                </>
              )}
            </div>
          </article>
        </div>
      </>
    );
  }

  // ── Search + Results View ────────────────────────────────────────
  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ minHeight: "100vh", background: "var(--cream)" }}>

        {/* Header */}
        <header style={{ background: "var(--navy-900)", borderBottom: "2px solid var(--gold-500)", padding: "0 var(--pad)" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 0 36px" }}>
            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none", marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>&larr;</span> Back to V2V
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(200,162,50,0.15)", border: "1px solid rgba(200,162,50,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold-400)" }}>
                <GavelIcon />
              </div>
              <h1 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: "var(--white)", letterSpacing: "-0.01em" }}>BVA Decision Search</h1>
            </div>
            <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, color: "rgba(255,255,255,0.55)", maxWidth: 520 }}>
              Search thousands of Board of Veterans' Appeals decisions by keyword, condition, or case number.
            </p>

            {/* Search form */}
            <form onSubmit={handleSearch} style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search BVA decisions... (e.g., PTSD, sleep apnea, tinnitus)"
                  style={{
                    width: "100%", padding: "12px 16px 12px 44px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)",
                    color: "var(--white)", fontSize: 15, fontFamily: "'Source Sans 3', sans-serif",
                    outline: "none", WebkitAppearance: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--gold-500)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                />
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", display: "flex", minHeight: "auto" }}>
                  <SearchIcon />
                </span>
              </div>

              {/* Year filter */}
              <div style={{ position: "relative" }}>
                <select
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  style={{
                    appearance: "none", padding: "12px 36px 12px 16px", borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)",
                    color: "var(--white)", fontSize: 14, fontFamily: "'Source Sans 3', sans-serif",
                    cursor: "pointer", outline: "none", minWidth: 100,
                  }}
                >
                  <option value="" style={{ background: "var(--navy-900)" }}>All Years</option>
                  {years.map(y => (
                    <option key={y} value={y} style={{ background: "var(--navy-900)" }}>{y}</option>
                  ))}
                </select>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", pointerEvents: "none", display: "flex", minHeight: "auto" }}>
                  <ChevronDown />
                </span>
              </div>

              <button type="submit" disabled={loading || !query.trim()} style={{
                padding: "12px 28px", borderRadius: 8, border: "none",
                background: query.trim() ? "var(--gold-500)" : "rgba(255,255,255,0.1)",
                color: query.trim() ? "var(--navy-900)" : "rgba(255,255,255,0.3)",
                fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, fontWeight: 700,
                cursor: query.trim() ? "pointer" : "default", transition: "background 0.2s", gap: 8,
              }}>
                {loading ? <Spinner /> : "Search"}
              </button>
            </form>
          </div>
        </header>

        {/* Results area */}
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px var(--pad) 80px" }}>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-muted)" }}>
              <div style={{ display: "inline-flex", marginBottom: 12 }}><Spinner size={32} /></div>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15 }}>Searching BVA decisions...</div>
            </div>
          )}

          {/* Spelling correction */}
          {spelling && !loading && (
            <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fff8e1", border: "1px solid #ffecb3", marginBottom: 16, fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: "#f57f17" }}>
              Did you mean: <button onClick={() => { setQuery(spelling); setPage(1); doSearch(spelling, year, 1); }} style={{ background: "none", border: "none", color: "var(--navy-700)", fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0, minHeight: "auto", fontSize: 14, fontFamily: "'Source Sans 3', sans-serif" }}>{spelling}</button>?
            </div>
          )}

          {/* Results header */}
          {results && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: "var(--ink-muted)" }}>
                <strong style={{ color: "var(--ink)" }}>{results.total?.toLocaleString()}</strong> results for "<strong>{results.query}</strong>"
                {year && <> in <strong>{year}</strong></>}
              </div>
              {totalPages > 1 && (
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ink-muted)" }}>
                  Page {page} of {totalPages}
                </div>
              )}
            </div>
          )}

          {/* Result cards */}
          {results && !loading && results.results?.map((r, i) => (
            <div
              key={`${r.url}-${i}`}
              onClick={() => openCase(r.url)}
              style={{
                padding: "20px 24px", marginBottom: 8, borderRadius: "var(--radius)",
                border: "1px solid var(--cream-border)", background: "var(--white)",
                cursor: "pointer", transition: "border-color 0.2s, box-shadow 0.2s",
                animation: `fadeUp 0.3s ease-out ${i * 0.03}s both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(11,26,46,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cream-border)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {r.case_number && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--gold-500)", letterSpacing: "0.06em", fontWeight: 500 }}>{cleanLabelText(r.case_number)}</span>
                  )}
                  {(r.publication_date || r.year) && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ink-muted)" }}>{formatDisplayDate(r.publication_date || r.year)}</span>
                  )}
                </div>
                <OutcomeBadge outcome={r.outcome} />
              </div>
              <h3 style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 18, fontWeight: 700, color: "var(--ink)", lineHeight: 1.35, marginBottom: 8 }}>
                {buildResultTitle(r)}
              </h3>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, color: "var(--ink-light)", lineHeight: 1.6, marginBottom: 10 }}>
                <Snippet html={buildResultSnippet(r)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--navy-700)" }}>
                Open decision <ArrowRight size={12} />
              </div>
            </div>
          ))}

          {/* Case loading */}
          {caseLoading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-muted)" }}>
              <div style={{ display: "inline-flex", marginBottom: 12 }}><Spinner size={32} /></div>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15 }}>Loading case details...</div>
            </div>
          )}

          {/* No results */}
          {results && !loading && results.results?.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16, display: "flex", justifyContent: "center", minHeight: "auto" }}>
                <GavelIcon />
              </div>
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>No decisions found</div>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, color: "var(--ink-muted)", maxWidth: 400, margin: "0 auto" }}>
                Try different keywords or remove the year filter. Use condition names, diagnostic codes, or legal terms.
              </div>
            </div>
          )}

          {/* Empty state */}
          {!results && !loading && !caseLoading && (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--cream-warm)", border: "1px solid var(--cream-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "var(--ink-muted)" }}>
                <GavelIcon />
              </div>
              <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Search BVA Decisions</div>
              <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, color: "var(--ink-muted)", maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>
                Search by condition, diagnostic code, legal issue, or keyword. Results include case details, outcomes, and decision text.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 28 }}>
                {["PTSD service connection", "sleep apnea nexus", "tinnitus rating", "TDIU unemployability", "Gulf War presumptive"].map(term => (
                  <button key={term} onClick={() => { setQuery(term); setPage(1); doSearch(term, year, 1); }}
                    style={{ padding: "8px 16px", borderRadius: 20, background: "var(--white)", border: "1px solid var(--cream-border)", fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: "var(--ink-light)", cursor: "pointer", transition: "border-color 0.2s, background 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.background = "var(--cream-warm)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cream-border)"; e.currentTarget.style.background = "var(--white)"; }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          {results && !loading && totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--cream-border)" }}>
              <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid var(--cream-border)", background: page <= 1 ? "var(--cream)" : "var(--white)", color: page <= 1 ? "var(--cream-border)" : "var(--ink)", cursor: page <= 1 ? "default" : "pointer", fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, gap: 4 }}>
                <ArrowLeft size={12} /> Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button key={p} onClick={() => handlePage(p)}
                    style={{
                      width: 36, height: 36, borderRadius: 6, border: "1px solid",
                      borderColor: p === page ? "var(--gold-500)" : "var(--cream-border)",
                      background: p === page ? "var(--navy-900)" : "var(--white)",
                      color: p === page ? "var(--gold-400)" : "var(--ink)",
                      cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages}
                style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid var(--cream-border)", background: page >= totalPages ? "var(--cream)" : "var(--white)", color: page >= totalPages ? "var(--cream-border)" : "var(--ink)", cursor: page >= totalPages ? "default" : "pointer", fontFamily: "'Source Sans 3', sans-serif", fontSize: 14, gap: 4 }}>
                Next <ArrowRight size={12} />
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    --navy-900: #0B1A2E;
    --navy-800: #0F2240;
    --navy-700: #15305A;
    --navy-600: #1C3E72;
    --gold-500: #C8A232;
    --gold-400: #D9B844;
    --gold-300: #E8CC6A;
    --cream: #FAFAF5;
    --cream-warm: #F5F2EA;
    --cream-border: #E8E4D8;
    --ink: #1A1D26;
    --ink-light: #4A4D5A;
    --ink-muted: #8A8D9A;
    --white: #ffffff;
    --radius: 10px;
    --max-w: 960px;
    --pad: 20px;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
  body { font-family: 'Source Sans 3', -apple-system, sans-serif; background: var(--cream); color: var(--ink); }
  ::selection { background: rgba(200,162,50,0.25); }

  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

  button, a { min-height: 44px; display: inline-flex; align-items: center; }

  @media (min-width: 768px) { :root { --pad: 32px; } }
  @media (min-width: 1024px) { :root { --pad: 40px; } }

  input::placeholder { color: rgba(255,255,255,0.35); }
`;
