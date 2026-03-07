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
  return (
    <article className="pub-card pub-card--default" onClick={() => onClick?.(article)}>
      {article.heroImage && (
        <div
          className="pub-card__thumb"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(11,26,46,0.25), rgba(11,26,46,0.5)), url(${article.heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div className="pub-card__content">
        <div className="pub-card__section">{article.category || article.section}</div>
        <h3 className="pub-card__title">{article.title}</h3>
        <p className="pub-card__excerpt">{article.excerpt}</p>
        <div className="pub-card__meta">
          <span className="pub-card__read-time">
            <ClockIcon /> {article.readTime}
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
