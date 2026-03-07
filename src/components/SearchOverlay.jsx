import { useState, useEffect, useRef, useCallback } from 'react';
import { CloseIcon, SearchIcon } from './icons.jsx';

export function SearchOverlay({ posts, guides, news, isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ articles: [], guides: [], news: [] });
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ articles: [], guides: [], news: [] });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const search = useCallback(
    (q) => {
      const term = q.toLowerCase().trim();
      if (!term) {
        setResults({ articles: [], guides: [], news: [] });
        return;
      }

      const match = (item) => {
        const fields = [
          item.title,
          item.excerpt,
          item.category,
          item.section,
          item.desc,
          ...(item.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return fields.includes(term);
      };

      setResults({
        articles: (posts || []).filter(match),
        guides: (guides || []).filter(match),
        news: (news || []).filter(match),
      });
    },
    [posts, guides, news]
  );

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleItemClick = (item) => {
    onNavigate?.(item);
    onClose();
  };

  if (!isOpen) return null;

  const totalResults =
    results.articles.length + results.guides.length + results.news.length;
  const hasQuery = query.trim().length > 0;

  return (
    <div
      className="pub-search-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pub-search-overlay__panel">
        <div className="pub-search__header">
          <div className="pub-search__input-wrap">
            <SearchIcon size={20} />
            <input
              ref={inputRef}
              className="pub-search__input"
              type="text"
              value={query}
              onChange={handleInput}
              placeholder="Search articles, guides, news..."
              autoComplete="off"
            />
          </div>
          <button className="pub-search__close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="pub-search__results">
          {!hasQuery && (
            <div className="pub-search__empty">Start typing to search...</div>
          )}
          {hasQuery && totalResults === 0 && (
            <div className="pub-search__empty">No results found</div>
          )}

          {results.articles.length > 0 && (
            <div className="pub-search__group">
              <div className="pub-search__group-title">
                Articles ({results.articles.length})
              </div>
              {results.articles.map((item) => (
                <div
                  key={item.id}
                  className="pub-search__result"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="pub-search__result-title">{item.title}</div>
                  {item.excerpt && (
                    <div className="pub-search__result-excerpt">
                      {item.excerpt}
                    </div>
                  )}
                  <span className="pub-search__result-badge">
                    {item.category || item.section || 'Article'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {results.guides.length > 0 && (
            <div className="pub-search__group">
              <div className="pub-search__group-title">
                Guides ({results.guides.length})
              </div>
              {results.guides.map((item) => (
                <div
                  key={item.id}
                  className="pub-search__result"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="pub-search__result-title">{item.title}</div>
                  {item.desc && (
                    <div className="pub-search__result-excerpt">{item.desc}</div>
                  )}
                  <span className="pub-search__result-badge">Guide</span>
                </div>
              ))}
            </div>
          )}

          {results.news.length > 0 && (
            <div className="pub-search__group">
              <div className="pub-search__group-title">
                News ({results.news.length})
              </div>
              {results.news.map((item) => (
                <div
                  key={item.id}
                  className="pub-search__result"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="pub-search__result-title">{item.title}</div>
                  {item.excerpt && (
                    <div className="pub-search__result-excerpt">
                      {item.excerpt}
                    </div>
                  )}
                  <span className="pub-search__result-badge">
                    {item.category || 'News'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
