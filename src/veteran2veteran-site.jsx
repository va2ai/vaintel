import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import './styles/publication.css';
import { Layout } from './components/Layout.jsx';
import { Hero, LatestRail } from './components/Hero.jsx';
import { SectionBlock } from './components/SectionBlock.jsx';
import { ArticlePage } from './components/ArticlePage.jsx';
import { GuidePage } from './components/GuidePage.jsx';
import { ToolsSection } from './components/ToolsSection.jsx';
import { SearchOverlay } from './components/SearchOverlay.jsx';
import { NewsletterSignup } from './components/NewsletterSignup.jsx';
import { Chat } from './components/Chat.jsx';
import { getPosts, getGuides, getNews } from './firestore.js';

// Category -> editorial section mapping
const SECTION_MAP = {
  "VA Policy": "va-policy",
  "Policy": "va-policy",
  "Claims Strategy": "claims-strategy",
  "Strategy": "claims-strategy",
  "CAVC": "cavc",
  "Appeals": "cavc",
  "Fed Circuit": "cavc",
  "Explainer": "explainers",
  "Know Your Rights": "opinion",
  "Opinion": "opinion",
};

function getSection(item) {
  if (item.section) return item.section;
  if (SECTION_MAP[item.category]) return SECTION_MAP[item.category];
  // Tag-based fallback
  const tags = item.tags || [];
  if (tags.includes("CAVC") || tags.includes("Appeals")) return "cavc";
  if (tags.includes("Policy") || tags.includes("PACT Act")) return "va-policy";
  if (tags.includes("Strategy") || tags.includes("Claims")) return "claims-strategy";
  if (tags.includes("Explainer")) return "explainers";
  return "claims-strategy"; // default
}

function filterBySection(items, sectionSlug) {
  return items.filter(item => getSection(item) === sectionSlug);
}

async function loadStaticContent() {
  const [postsRes, newsRes, guidesRes] = await Promise.all([
    fetch("/posts.json"),
    fetch("/news.json"),
    fetch("/guides.json"),
  ]);

  const [postsData, newsData, guidesData] = await Promise.all([
    postsRes.json(),
    newsRes.json(),
    guidesRes.json(),
  ]);

  return {
    posts: postsData,
    news: newsData,
    guides: guidesData,
  };
}

export default function V2VSite() {
  const [posts, setPosts] = useState([]);
  const [news, setNews] = useState([]);
  const [guides, setGuides] = useState([]);
  const [activeArticle, setActiveArticle] = useState(null);
  const [activeNews, setActiveNews] = useState(null);
  const [activeGuide, setActiveGuide] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const route = location.pathname;

  // Load data
  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      try {
        const [postsData, guidesData, newsData] = await Promise.all([
          getPosts(),
          getGuides(),
          getNews(),
        ]);

        if (cancelled) return;
        setPosts(postsData);
        setGuides(guidesData);
        setNews(newsData);
      } catch (firestoreError) {
        console.warn("Falling back to static content files:", firestoreError);
        try {
          const staticContent = await loadStaticContent();
          if (cancelled) return;
          setPosts(staticContent.posts);
          setNews(staticContent.news);
          setGuides(staticContent.guides);
        } catch (staticError) {
          console.error("Failed to load site content:", staticError);
        }
      }
    };

    loadContent();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle route changes
  useEffect(() => {
    if (!route) return;
    // /section/:slug
    const sectionMatch = route.match(/^\/section\/(.+)/);
    if (sectionMatch) {
      setSectionFilter(sectionMatch[1]);
      setActiveArticle(null);
      setActiveNews(null);
      setActiveGuide(null);
      return;
    }
    // /article/:id
    const articleMatch = route.match(/^\/article\/(.+)/);
    if (articleMatch && (posts.length > 0 || news.length > 0)) {
      const id = articleMatch[1];
      const post = posts.find(p => String(p.id) === id);
      if (post) { setActiveArticle(post); setActiveNews(null); setActiveGuide(null); return; }
      
      const newsItem = news.find(n => String(n.id) === id);
      if (newsItem) { setActiveNews(newsItem); setActiveArticle(null); setActiveGuide(null); return; }
    }
    // /guide/:id
    const guideMatch = route.match(/^\/guide\/(.+)/);
    if (guideMatch && guides.length) {
      const guide = guides.find(g => g.id === guideMatch[1]);
      if (guide) { setActiveGuide(guide); setActiveArticle(null); setActiveNews(null); return; }
    }
    // /tools
    if (route === "/tools") {
      setSectionFilter(null);
      setActiveArticle(null);
      setActiveNews(null);
      setActiveGuide(null);
      // Scroll to tools after render
      setTimeout(() => document.getElementById("resources")?.scrollIntoView({ behavior: "smooth" }), 100);
      return;
    }
    // / or unknown -> homepage
    if (route === "/" || route === "") {
      setSectionFilter(null);
      setActiveArticle(null);
      setActiveNews(null);
      setActiveGuide(null);
    }
  }, [route, posts.length, news.length, guides.length]);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    });
    const observe = () => document.querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
    observe();
    const timer = setTimeout(observe, 500);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [posts.length, news.length, guides.length, activeArticle, activeNews, activeGuide, sectionFilter]);

  // Navigation helpers
  const openArticle = (post) => {
    navigate(`/article/${post.id}`);
  };

  const openNews = (story) => {
    // For now we map news to /article since the structure supports it
    // or if a distinct route is preferred, we use /article/ for all posts.
    // If the data is separated, we must ensure IDs don't clash or use /news/:id.
    // Since activeNews is processed with posts logic in the router, we'll keep it simple.
    // Wait, let's use the local state update to preserve the existing behavior for now, 
    // or properly map it to the route.
    navigate(`/article/${story.id}`);
  };

  const openGuide = (guide) => {
    navigate(`/guide/${guide.id}`);
  };

  const goHome = () => {
    navigate("/");
  };

  // Determine active nav section
  const activeSection = sectionFilter || (activeGuide ? "tools" : "latest");

  // Search navigate handler
  const handleSearchNavigate = (item) => {
    setSearchOpen(false);
    if (item.sections) { openGuide(item); }
    else if (item.breaking !== undefined) { openNews(item); }
    else { openArticle(item); }
  };

  // Hero item click handler
  const handleHeroItemClick = (item) => {
    if (item.type === "news") openNews(item);
    else openArticle(item);
  };

  // ── Article View ──────────────────────────────────────────────
  if (activeArticle) {
    return (
      <Layout activeSection={getSection(activeArticle)} onSearchClick={() => setSearchOpen(true)}>
        <ArticlePage
          article={activeArticle}
          allPosts={posts}
          onBack={goHome}
          onArticleClick={openArticle}
          isNews={false}
        />
        <Chat contextTitle={activeArticle.title} contextType="article" contextText={activeArticle.summary || activeArticle.body} />
        <SearchOverlay posts={posts} guides={guides} news={news} isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={handleSearchNavigate} />
      </Layout>
    );
  }

  // ── News Article View ─────────────────────────────────────────
  if (activeNews) {
    const isMedRule = activeNews.id === "n001" || activeNews.title?.includes("Medication Rule");
    const medSuggestions = [
      "How to fight a proposed rating reduction",
      "BVA cases involving medication-controlled conditions",
      "What 'sustained improvement' means under 38 CFR § 3.344"
    ];

    return (
      <Layout activeSection="va-policy" onSearchClick={() => setSearchOpen(true)}>
        <ArticlePage
          article={activeNews}
          allPosts={news}
          onBack={goHome}
          onArticleClick={openNews}
          isNews={true}
        />
        <Chat 
          contextTitle={activeNews.title} 
          contextType="news story" 
          contextText={activeNews.summary || activeNews.body} 
          suggestions={isMedRule ? medSuggestions : null}
        />
        <SearchOverlay posts={posts} guides={guides} news={news} isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={handleSearchNavigate} />
      </Layout>
    );
  }

  // ── Guide View ────────────────────────────────────────────────
  if (activeGuide) {
    return (
      <Layout activeSection="tools" onSearchClick={() => setSearchOpen(true)}>
        <GuidePage
          guide={activeGuide}
          guides={guides}
          onBack={goHome}
          onGuideClick={openGuide}
        />
        <Chat contextTitle={activeGuide.title} contextType="guide" contextText={activeGuide.sections?.map(s => s.content).join('\n')} />
        <SearchOverlay posts={posts} guides={guides} news={news} isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={handleSearchNavigate} />
      </Layout>
    );
  }

  // ── Section Page ──────────────────────────────────────────────
  if (sectionFilter) {
    const SECTION_TITLES = {
      "va-policy": "VA Policy",
      "claims-strategy": "Claims Strategy",
      "cavc": "Case Analysis",
      "explainers": "Research Guides & Explainers",
      "opinion": "Opinion",
    };
    const SECTION_DESCRIPTIONS = {
      "va-policy": "Regulation updates, rulemaking analysis, M21-1 changes, and policy impact reporting.",
      "claims-strategy": "Evidence building, filing tactics, nexus letter guidance, and claim-strengthening workflows.",
      "cavc": "BVA decision patterns, CAVC precedent breakdowns, and appellate strategy.",
      "explainers": "Plain-language guides to VA processes, rating criteria, and veteran rights.",
      "opinion": "Analysis and commentary on systemic issues, AI in claims, and veteran advocacy.",
    };
    const sectionTitle = SECTION_TITLES[sectionFilter] || sectionFilter;
    const sectionDesc = SECTION_DESCRIPTIONS[sectionFilter];
    const allContent = [...posts, ...news];
    const sectionItems = filterBySection(allContent, sectionFilter);

    return (
      <Layout activeSection={sectionFilter} onSearchClick={() => setSearchOpen(true)}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 20px" }}>
          {sectionDesc && (
            <p style={{ fontFamily: "var(--sans)", fontSize: 15, color: "var(--ink-light)", lineHeight: 1.6, marginBottom: 24, maxWidth: 680 }}>
              {sectionDesc}
            </p>
          )}
          <SectionBlock
            title={sectionTitle}
            sectionSlug={sectionFilter}
            items={sectionItems}
            onItemClick={(item) => item.breaking !== undefined ? openNews(item) : openArticle(item)}
          />
        </div>
        <Chat contextTitle={sectionTitle} contextType="section" />
        <SearchOverlay posts={posts} guides={guides} news={news} isOpen={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={handleSearchNavigate} />
      </Layout>
    );
  }

  // ── Homepage ──────────────────────────────────────────────────
  const allContent = [...posts, ...news];
  const heroItem = allContent.find(i => i.isFeaturedHero) || allContent.find(i => i.featured) || allContent[0];
  const heroId = heroItem?.id;

  return (
    <Layout activeSection="latest" onSearchClick={() => setSearchOpen(true)}>
      
      {/* ── Authority Publication Masthead ── */}
      <div style={{ background: "var(--navy-900)", padding: "32px 24px", textAlign: "center", borderBottom: "4px solid var(--gold-500)" }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, color: "white", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
          VA Claims Intelligence
        </h1>
        <p style={{ fontFamily: "var(--sans)", fontSize: "clamp(14px, 2vw, 16px)", color: "var(--gold-400)", margin: 0, fontWeight: 500, letterSpacing: "0.5px" }}>
          Independent reporting and claims intelligence for VA disability claims, appeals, and case strategy.
        </p>
      </div>

      {/* Hero + Latest Rail (Authority Layer Top) */}
      <div className="pub-hero-section">
        <div className="pub-hero-layout">
          <Hero
            posts={posts}
            news={news}
            onArticleClick={openArticle}
            onNewsClick={openNews}
          />
          <LatestRail
            posts={posts}
            news={news}
            excludeId={heroId}
            onItemClick={handleHeroItemClick}
          />
        </div>
      </div>

      {/* VA Policy Section */}
      <SectionBlock
        title="Latest VA Policy"
        sectionSlug="va-policy"
        items={filterBySection(allContent, "va-policy")}
        onItemClick={(item) => item.breaking !== undefined ? openNews(item) : openArticle(item)}
      />

      {/* Court Watch (CAVC) */}
      <SectionBlock
        title="Case Analysis & CAVC Precedent"
        sectionSlug="cavc"
        items={filterBySection(allContent, "cavc")}
        onItemClick={(item) => item.breaking !== undefined ? openNews(item) : openArticle(item)}
      />

      {/* Claims Strategy */}
      <SectionBlock
        title="Claims Strategy & Evidence"
        sectionSlug="claims-strategy"
        items={filterBySection(allContent, "claims-strategy")}
        onItemClick={(item) => item.breaking !== undefined ? openNews(item) : openArticle(item)}
      />

      {/* Explainers */}
      <SectionBlock
        title="Research Guides & Explainers"
        sectionSlug="explainers"
        items={filterBySection(allContent, "explainers")}
        onItemClick={(item) => item.breaking !== undefined ? openNews(item) : openArticle(item)}
      />

      {/* ── AI Tools (Product Layer seamlessly integrated) ── */}
      <div style={{ background: "var(--white)", borderTop: "1px solid var(--cream-border)", borderBottom: "1px solid var(--cream-border)" }}>
        <ToolsSection
          onChatOpen={() => {}}
          guides={guides}
          onGuideClick={openGuide}
        />
      </div>

      {/* Newsletter */}
      <NewsletterSignup />

      {/* Chat Widget */}
      <Chat />

      {/* Search Overlay */}
      <SearchOverlay
        posts={posts}
        guides={guides}
        news={news}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleSearchNavigate}
      />
    </Layout>
  );
}
