import { ArrowLeft, ArrowRight } from './icons.jsx';
import { TimeTag, renderMarkdown, ArticleSchemaScript } from './markdown.jsx';

export function ArticlePage({ article, allPosts, onBack, onArticleClick, isNews }) {
  const backLabel = isNews ? "Back to News" : "Back";

  // Related articles: exclude current, take 3
  const related = allPosts.filter(p => p.id !== article.id).slice(0, isNews ? 4 : 3);

  // Breadcrumb section label
  const sectionLabel = article.section || article.category || (isNews ? "News" : "Analysis");

  // Safe HTML rendering: renderMarkdown() calls DOMPurify.sanitize() internally
  const safeBodyHTML = renderMarkdown(article.body);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Sticky top bar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: isNews ? "rgba(11,26,46,0.97)" : "rgba(250,250,245,0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: isNews ? "2px solid var(--gold-500)" : "1px solid var(--cream-border)",
        padding: "0 var(--pad)",
      }}>
        <div style={{ maxWidth: "var(--max-w)", margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer",
            color: isNews ? "var(--gold-400)" : "var(--navy-700)",
            fontFamily: "'Source Sans 3'", fontSize: 14, fontWeight: 600, gap: 6, padding: "8px 0",
          }}><ArrowLeft size={16} /> {backLabel}</button>
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: isNews ? "rgba(255,255,255,0.5)" : "var(--ink-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{article.readTime || article.readtime} read</span>
        </div>
      </nav>

      {/* Breadcrumb & Section row */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "16px 32px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Source Sans 3'", fontSize: 13, color: "var(--ink-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ cursor: "pointer", transition: "color 0.15s" }} onClick={onBack} onMouseEnter={e => e.target.style.color = "var(--navy-700)"} onMouseLeave={e => e.target.style.color = "var(--ink-muted)"}>{isNews ? "News" : "Analysis"}</span>
          <span style={{ color: "var(--cream-border)" }}>/</span>
          <span style={{ color: "var(--ink-light)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{article.title}</span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase",
          color: "var(--gold-500)", fontWeight: 600,
        }}>{sectionLabel}</div>
      </div>

      {/* Hero header */}
      <header
        className="article-hero"
        style={{
          animation: "fadeUp 0.4s ease-out",
          ...(article.heroImage ? {
            backgroundImage: `linear-gradient(to bottom, rgba(11,26,46,0.82), rgba(11,26,46,0.95)), url(${article.heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          } : {}),
        }}
      >
        <div className="article-hero-inner">
          {/* Breaking badge for news */}
          {isNews && article.breaking && (
            <div style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 4, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 700, color: "#ef4444", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, gap: 6, alignItems: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "dotPulse 1.5s infinite" }} />Breaking
            </div>
          )}
          <div className="article-hero-tag">{article.category}</div>

          {/* Large headline */}
          <h1>{article.title}</h1>

          {/* Excerpt as subheadline */}
          {article.excerpt && <p className="article-hero-subtitle" style={{ fontStyle: "italic" }}>{article.excerpt}</p>}

          {/* Byline */}
          <div className="article-hero-meta">
            <strong>{article.author || "Chris Combs"}</strong>
            <span className="dot" />
            <span>Veteran 2 Veteran</span>
            <span className="dot" />
            <TimeTag date={article.date} />
            <span className="dot" />
            <span>{article.readTime || article.readtime} read</span>
          </div>
        </div>
        <ArticleSchemaScript article={article} />
      </header>

      {/* KeyTakeaway box if available */}
      {article.keyTakeaway && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px 0" }}>
          <div style={{ background: "var(--cream-warm)", border: "1px solid var(--cream-border)", borderLeft: "3px solid var(--gold-500)", borderRadius: "0 8px 8px 0", padding: "20px 24px" }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-500)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Key Takeaway</div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink)", lineHeight: 1.6, margin: 0 }}>{article.keyTakeaway}</p>
          </div>
        </div>
      )}

      {/* Hero image (full-width) if present and not used as background */}
      {article.heroImage && !isNews && (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 32px 0" }}>
          <img src={article.heroImage} alt={article.title} style={{ width: "100%", borderRadius: 8, display: "block" }} loading="lazy" />
        </div>
      )}

      {/* Article body -- safeBodyHTML is DOMPurify-sanitized via renderMarkdown() */}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: safeBodyHTML }}
      />

      {/* Source documents section */}
      {article.sources && article.sources.length > 0 && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px 24px" }}>
          <div style={{ background: "var(--cream-warm)", border: "1px solid var(--cream-border)", borderRadius: 8, padding: "20px 24px" }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--ink-muted)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Source Documents</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {article.sources.map((src, i) => (
                <li key={i}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--navy-700)", textDecoration: "underline", textDecorationColor: "var(--gold-400)", textUnderlineOffset: 3 }}>
                    {src.title || src.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* "What this means for veterans" callout */}
      {article.whatThisMeans && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px 24px" }}>
          <div style={{ background: "var(--navy-900)", borderRadius: 8, padding: "24px 28px", color: "var(--white)" }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-400)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>What This Means for Veterans</div>
            <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, margin: 0 }}>{article.whatThisMeans}</p>
          </div>
        </div>
      )}

      {/* Tags + Related articles */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px 80px" }}>
        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div style={{ paddingTop: 24, borderTop: "1px solid var(--cream-border)", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {article.tags.map(t => (
              <span key={t} style={{ padding: "6px 14px", borderRadius: 2, background: "var(--cream-warm)", border: "1px solid var(--cream-border)", fontFamily: "'JetBrains Mono'", fontSize: 11, color: "var(--ink-light)", letterSpacing: "0.5px" }}>{t}</span>
            ))}
          </div>
        )}

        {/* Related / Keep Reading */}
        {related.length > 0 && (
          <div style={{ marginTop: isNews ? 36 : 48 }}>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>{isNews ? "More News" : "Keep Reading"}</h3>
            {related.map(p => (
              <div key={p.id} onClick={() => onArticleClick(p)} style={{ padding: isNews ? "14px 0" : "16px 0", borderBottom: "1px solid var(--cream-border)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-500)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                    {p.category}{isNews ? <> &middot; <TimeTag date={p.date} /></> : ""}
                  </div>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.35 }}>{p.title}</div>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--ink-muted)", whiteSpace: "nowrap", marginTop: 2 }}>{p.readTime}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
