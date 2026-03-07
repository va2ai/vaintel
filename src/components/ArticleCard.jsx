import { ClockIcon } from './icons.jsx';
import { TimeTag } from './markdown.jsx';

export function ArticleCard({ article, onClick, variant = 'default' }) {
  if (variant === 'compact') {
    return (
      <div className="pub-card pub-card--compact" onClick={() => onClick?.(article)}>
        <div className="pub-card__title">{article.title}</div>
        <TimeTag date={article.date} />
      </div>
    );
  }

  if (variant === 'featured') {
    const bgStyle = article.heroImage
      ? {
        backgroundImage: `linear-gradient(135deg, rgba(11,26,46,0.92), rgba(11,26,46,0.97)), url(${article.heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
      : {};

    return (
      <div
        className="pub-card pub-card--featured"
        onClick={() => onClick?.(article)}
        style={bgStyle}
      >
        <div className="pub-card__body">
          {article.breaking && (
            <div className="pub-card__breaking">
              <span className="pub-card__breaking-dot" />
              Breaking
            </div>
          )}
          <div className="pub-card__section">{article.category || article.section}</div>
          <h3 className="pub-card__headline">{article.title}</h3>
          <p className="pub-card__excerpt">{article.excerpt}</p>
          <div className="pub-card__meta">
            <span className="pub-card__author">{article.author || 'V2V Staff'}</span>
            <span className="pub-card__dot" />
            <TimeTag date={article.date} />
            {article.readTime && (
              <>
                <span className="pub-card__dot" />
                <span className="pub-card__read-time">
                  <ClockIcon /> {article.readTime}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // default variant
  const categoryStr = String(article.category || article.section || '');
  let bgGradient = 'linear-gradient(135deg, var(--navy-800), var(--navy-900))';

  if (categoryStr.includes('Policy')) {
    bgGradient = 'linear-gradient(135deg, #1e3a8a, #0f172a)'; // Blue
  } else if (categoryStr.includes('CAVC') || categoryStr.includes('Appeals')) {
    bgGradient = 'linear-gradient(135deg, #4c1d95, #18181b)'; // Purple
  } else if (categoryStr.includes('Strategy') || categoryStr.includes('Claims')) {
    bgGradient = 'linear-gradient(135deg, #065f46, #022c22)'; // Green
  } else if (categoryStr.includes('Mental Health') || categoryStr.includes('PTSD')) {
    bgGradient = 'linear-gradient(135deg, #991b1b, #450a0a)'; // Red
  } else if (categoryStr.includes('Opinion')) {
    bgGradient = 'linear-gradient(135deg, #9a3412, #431407)'; // Orange
  }

  // Use the unique image if it exists, otherwise fall back to the category gradient
  const thumbStyle = article.heroImage
    ? {
      backgroundImage: `linear-gradient(135deg, rgba(11,26,46,0.25), rgba(11,26,46,0.5)), url(${article.heroImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
    : {
      background: bgGradient,
    };

  return (
    <article className={`pub-card pub-card--${variant}`} onClick={() => onClick?.(article)}>
      {variant !== 'text-forward' && (
        <div className="pub-card__thumb" style={thumbStyle} />
      )}
      <div className="pub-card__content">
        <div className="pub-card__section">{article.category || article.section}</div>
        <h3 className="pub-card__title">{article.title}</h3>
        {article.excerpt && <p className="pub-card__excerpt">{article.excerpt}</p>}
        <div className="pub-card__meta">
          <span className="pub-card__read-time">
            <ClockIcon /> {article.readTime || '5 min'}
          </span>
          {article.tags && article.tags.length > 0 && (
            <div className="pub-card__tags">
              {article.tags.slice(0, 2).map((t) => (
                <span key={t} className="pub-card__tag">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function KeyTakeaway({ text, variant = 'takeaway' }) {
  const prefixes = {
    takeaway: 'The bottom line:',
    whyItMatters: 'Why it matters:',
    whatThisMeans: 'What this means for veterans:',
  };

  const classMap = {
    takeaway: 'pub-takeaway',
    whyItMatters: 'pub-takeaway pub-takeaway--why',
    whatThisMeans: 'pub-takeaway pub-takeaway--what',
  };

  return (
    <div className={classMap[variant] || 'pub-takeaway'}>
      <strong className="pub-takeaway__prefix">{prefixes[variant]}</strong>{' '}
      <span className="pub-takeaway__text">{text}</span>
    </div>
  );
}
