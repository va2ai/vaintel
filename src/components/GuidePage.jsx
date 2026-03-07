import { ArrowLeft, ArrowRight } from './icons.jsx';
import { TimeTag, renderMarkdown, replaceHeadingIcons } from './markdown.jsx';
import { VaMathCalc } from './VaMathCalc.jsx';

export function GuidePage({ guide, guides, onBack, onGuideClick }) {
  const guideIdx = guides.findIndex(g => g.id === guide.id);
  const nextGuide = guides[(guideIdx + 1) % guides.length];
  const prevGuide = guides[(guideIdx - 1 + guides.length) % guides.length];

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Sticky nav bar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,250,245,0.95)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--cream-border)", padding: "0 var(--pad)",
      }}>
        <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer", color: "var(--navy-700)",
            fontFamily: "'Source Sans 3'", fontSize: 14, fontWeight: 600, gap: 6, padding: "8px 0",
          }}><ArrowLeft size={16} /> All Guides</button>
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{guide.readTime} read</span>
        </div>
      </nav>

      {/* Dark navy hero */}
      <header
        className="article-hero"
        style={{
          animation: "fadeUp 0.4s ease-out",
          ...(guide.heroImage ? {
            backgroundImage: `linear-gradient(to bottom, rgba(11,26,46,0.82), rgba(11,26,46,0.95)), url(${guide.heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {}),
        }}
      >
        <div className="article-hero-inner">
          <div className="article-hero-tag">Quick Guide</div>
          <h1>{guide.title}</h1>
          <p className="article-hero-subtitle">{guide.desc}</p>
          <div className="article-hero-meta">
            <strong>Veteran 2 Veteran</strong>
            <span className="dot" />
            <span>{guide.readTime} read</span>
            <span className="dot" />
            <span>{guide.sections.length} sections</span>
          </div>
        </div>
      </header>

      {/* Guide body */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 32px 80px" }}>
        {/* Table of Contents */}
        <div style={{ background: "var(--cream-warm)", border: "1px solid var(--cream-border)", borderRadius: 4, padding: "20px 24px", marginBottom: 40 }}>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 500, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 12 }}>In this guide</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            {guide.sections.map((s, i) => (
              <li key={i} style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--navy-700)", cursor: "pointer", lineHeight: 1.4 }}
                onClick={() => document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <span style={{ textDecoration: "none", borderBottom: "1px solid transparent" }}
                  onMouseEnter={e => e.currentTarget.style.borderBottomColor = "var(--gold-500)"}
                  onMouseLeave={e => e.currentTarget.style.borderBottomColor = "transparent"}>
                  {replaceHeadingIcons(s.heading)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* VA Math Calculator (only on va-math guide) */}
        {guide.id === "va-math" && <VaMathCalc />}

        {/* Sections -- rendered via renderMarkdown (DOMPurify-sanitized) */}
        {guide.sections.map((s, i) => (
          <div key={i} id={`section-${i}`} style={{ marginBottom: 36, scrollMarginTop: 72 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--navy-900)", color: "var(--gold-400)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono'", fontSize: 12, fontWeight: 600, flexShrink: 0, minHeight: "auto" }}>{i + 1}</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{replaceHeadingIcons(s.heading)}</h2>
            </div>
            <div className="article-body" style={{ paddingLeft: 40, padding: "0 0 0 40px", maxWidth: "none" }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body) }}
            />
            {i < guide.sections.length - 1 && <div style={{ borderBottom: "1px solid var(--cream-border)", marginTop: 36, marginLeft: 40 }} />}
          </div>
        ))}

        {/* Prev / Next Navigation */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "2px solid var(--cream-border)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div onClick={() => onGuideClick(prevGuide)} style={{ padding: "16px 20px", borderRadius: 4, border: "1px solid var(--cream-border)", cursor: "pointer", transition: "border-color 0.2s, background 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.background = "var(--cream-warm)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cream-border)"; e.currentTarget.style.background = "transparent"; }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}><ArrowLeft size={10} /> Previous</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{prevGuide.title}</div>
          </div>
          <div onClick={() => onGuideClick(nextGuide)} style={{ padding: "16px 20px", borderRadius: 4, border: "1px solid var(--cream-border)", cursor: "pointer", textAlign: "right", transition: "border-color 0.2s, background 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold-500)"; e.currentTarget.style.background = "var(--cream-warm)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--cream-border)"; e.currentTarget.style.background = "transparent"; }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Next <ArrowRight size={10} /></div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{nextGuide.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
