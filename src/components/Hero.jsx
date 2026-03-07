import { ArrowRight, ClockIcon } from './icons.jsx';
import { TimeTag } from './markdown.jsx';

export function Hero({ posts, news, onArticleClick, onNewsClick }) {
  // Pick hero: isFeaturedHero > featured > most recent
  const allItems = [
    ...(posts || []).map((p) => ({ ...p, type: 'post' })),
    ...(news || []).map((n) => ({ ...n, type: 'news' })),
  ];

  const hero =
    allItems.find((i) => i.isFeaturedHero) ||
    allItems.find((i) => i.featured) ||
    allItems[0];

  if (!hero) return null;

  const handleClick = () => {
    if (hero.type === 'news') {
      onNewsClick?.(hero);
    } else {
      onArticleClick?.(hero);
    }
  };

  const bgStyle = hero.heroImage
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(11,26,46,0.65), rgba(11,26,46,0.92)), url(${hero.heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <section className="pub-hero" style={bgStyle} onClick={handleClick}>
      <div className="pub-hero__inner">
        <div className="pub-hero__category">
          {hero.category || hero.section || 'Latest'}
        </div>
        <h1 className="pub-hero__headline">{hero.title}</h1>
        {hero.excerpt && (
          <p className="pub-hero__excerpt">{hero.excerpt}</p>
        )}
        <div className="pub-hero__meta">
          <span className="pub-hero__author">
            {hero.author || 'V2V Staff'}
          </span>
          <span className="pub-hero__dot" />
          <TimeTag date={hero.date} />
          {hero.readTime && (
            <>
              <span className="pub-hero__dot" />
              <span className="pub-hero__read-time">
                <ClockIcon /> {hero.readTime}
              </span>
            </>
          )}
        </div>
        <button className="pub-hero__cta" onClick={handleClick}>
          Read full story <ArrowRight />
        </button>
      </div>
    </section>
  );
}

export function LatestRail({ posts, news, excludeId, onItemClick }) {
  // Combine posts + news, sort by date desc, take 8
  const allItems = [
    ...(posts || []).map((p) => ({ ...p, type: 'post' })),
    ...(news || []).map((n) => ({ ...n, type: 'news' })),
  ]
    .filter((i) => i.id !== excludeId)
    .sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      return db - da;
    })
    .slice(0, 8);

  if (allItems.length === 0) return null;

  // Relative timestamp helper
  const relativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now - then;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return dateStr;
  };

  return (
    <aside className="pub-latest-rail">
      <div className="pub-latest-rail__header">Latest</div>
      <div className="pub-latest-rail__list">
        {allItems.map((item) => (
          <div
            key={item.id}
            className="pub-latest-rail__item"
            onClick={() => onItemClick?.(item)}
          >
            <div className="pub-latest-rail__title">{item.title}</div>
            <div className="pub-latest-rail__time">
              {relativeTime(item.date)}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
