import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MenuIcon, CloseIcon, SearchIcon } from './icons.jsx';

const NAV_SECTIONS = [
  { label: 'Home', slug: 'latest', path: '/' },
  { label: 'Policy', slug: 'va-policy', path: '/section/va-policy' },
  { label: 'Claims Strategy', slug: 'claims-strategy', path: '/section/claims-strategy' },
  { label: 'Case Analysis', slug: 'cavc', path: '/section/cavc' },
  { label: 'Decision Search', slug: 'research', path: '/bva' },
  { label: 'Tools', slug: 'tools', path: '/tools' },
];

export { NAV_SECTIONS };

export function UtilityBar({ onSearchClick }) {
  return (
    <div className="pub-utility-bar">
      <div className="pub-utility-bar__inner">
        <Link to="/" className="pub-utility-bar__logo">
          <div className="pub-logo-mark">V2</div>
          <span className="pub-logo-text">Veteran 2 Veteran</span>
        </Link>
        <div className="pub-utility-bar__links">
          <button
            className="pub-utility-bar__btn"
            onClick={onSearchClick}
            aria-label="Search"
          >
            <SearchIcon size={16} />
          </button>
          <a className="pub-utility-bar__link" href="#newsletter">Weekly Brief</a>
          <a className="pub-utility-bar__link" href="#about">About</a>
        </div>
      </div>
    </div>
  );
}

export function MainNav({ activeSection, onSearchClick }) {
  return (
    <nav className="pub-main-nav">
      <div className="pub-main-nav__inner">
        {NAV_SECTIONS.map((s) => (
          <Link
            key={s.slug}
            to={s.path}
            className={
              'pub-main-nav__link' +
              (activeSection === s.slug ? ' pub-main-nav__link--active' : '')
            }
          >
            {s.label}
          </Link>
        ))}
        <button
          className="pub-main-nav__search"
          onClick={onSearchClick}
          aria-label="Search"
        >
          <SearchIcon size={15} />
        </button>
      </div>
    </nav>
  );
}

export function Footer() {
  const columns = [
    {
      title: 'Publication',
      links: [
        { label: 'Latest News', path: '/' },
        { label: 'Policy', path: '/section/va-policy' },
        { label: 'Claims Strategy', path: '/section/claims-strategy' },
        { label: 'Case Analysis', path: '/section/cavc' },
      ],
    },
    {
      title: 'Products',
      links: [
        { label: 'Decision Search', path: '/bva' },
        { label: 'Nexus Scout', path: '/nexus-scout' },
        { label: 'Tools', path: '/tools' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', path: '#about' },
        { label: 'Contact', path: '#about' },
        { label: 'Privacy', path: '#' },
        { label: 'Terms', path: '#' },
      ],
    },
  ];

  return (
    <footer className="pub-footer">
      <div className="pub-footer__inner">
        <div className="pub-footer__brand">
          <div className="pub-footer__logo">
            <div className="pub-logo-mark">V2</div>
            <span className="pub-footer__name">Veteran 2 Veteran LLC</span>
          </div>
          <p className="pub-footer__tagline">
            Independent reporting and claims intelligence for VA disability claims, appeals, and advocacy.
          </p>
        </div>
        <div className="pub-footer__columns">
          {columns.map((col) => (
            <div key={col.title} className="pub-footer__col">
              <div className="pub-footer__col-title">{col.title}</div>
              {col.links.map((l) => (
                l.path.startsWith('#') ? (
                  <a key={l.label} className="pub-footer__col-link" href={l.path}>{l.label}</a>
                ) : (
                  <Link key={l.label} className="pub-footer__col-link" to={l.path}>{l.label}</Link>
                )
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="pub-footer__bottom">
        <span>&copy; 2026 Veteran 2 Veteran LLC</span>
        <span>Not legal advice. Not affiliated with VA.</span>
      </div>
    </footer>
  );
}

export function MobileMenu({ isOpen, onClose, activeSection }) {
  if (!isOpen) return null;

  return (
    <div className="pub-mobile-menu" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="pub-mobile-menu__drawer">
        <div className="pub-mobile-menu__header">
          <Link to="/" className="pub-mobile-menu__logo" onClick={onClose}>
            <div className="pub-logo-mark">V2</div>
            <span className="pub-logo-text">Veteran 2 Veteran</span>
          </Link>
          <button className="pub-mobile-menu__close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <nav className="pub-mobile-menu__nav">
          {NAV_SECTIONS.map((s) => (
            <Link
              key={s.slug}
              to={s.path}
              className={
                'pub-mobile-menu__link' +
                (activeSection === s.slug ? ' pub-mobile-menu__link--active' : '')
              }
              onClick={onClose}
            >
              {s.label}
              <ArrowRight size={12} />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function Layout({ children, activeSection, onSearchClick }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="pub-layout">
      <UtilityBar onSearchClick={onSearchClick} />
      <MainNav activeSection={activeSection} onSearchClick={onSearchClick} />
      <button
        className="pub-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activeSection={activeSection}
      />
      <main className="pub-main">{children}</main>
      <Footer />
    </div>
  );
}
