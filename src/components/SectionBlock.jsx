import { Link } from 'react-router-dom';
import { ArrowRight } from './icons.jsx';
import { ArticleCard } from './ArticleCard.jsx';

export function SectionBlock({ title, sectionSlug, items, onItemClick }) {
  if (!items || items.length === 0) return null;

  const featured = items[0];
  const rest = items.slice(1, 4);

  return (
    <section className="pub-section">
      <div className="pub-section__label">{title}</div>
      <div className="pub-section__content">
        <ArticleCard
          article={featured}
          onClick={onItemClick}
          variant="featured"
        />
        {rest.length > 0 && (
          <div className="pub-section__grid">
            {rest.map((item) => (
              <ArticleCard
                key={item.id}
                article={item}
                onClick={onItemClick}
                variant="default"
              />
            ))}
          </div>
        )}
      </div>
      <Link
        className="pub-section__view-all"
        to={`/section/${sectionSlug}`}
      >
        View all <ArrowRight size={12} />
      </Link>
    </section>
  );
}
