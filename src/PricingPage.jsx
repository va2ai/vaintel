import { Link } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import './styles/publication.css';

const TIERS = [
  {
    name: "Free",
    price: "$0",
    desc: "Learn the rules and start researching",
    audience: "Veterans and first-time researchers",
    color: "var(--gold-500)",
    products: [
      "Full publication access",
      "Weekly Brief newsletter",
      "BVA Decision Search",
      "38 CFR Navigator",
      "KnowVA / M21-1 Search",
      "VA Math Calculator",
      "CAVC Precedent Library",
      "Nexus Scout Lite",
    ],
    cta: "Start Research",
    ctaLink: "/tools",
  },
  {
    name: "Pro",
    price: "Coming Soon",
    desc: "Build stronger claim strategy with deeper guided research",
    audience: "Serious claimants and advanced researchers",
    color: "#818cf8",
    products: [
      "Everything in Free",
      "Claim Research Assistant",
      "Nexus Scout Pro",
      "CAVC Case Analyzer",
      "Saved research sessions",
      "Research packet export",
    ],
    cta: "Join Waitlist",
    ctaLink: null,
  },
  {
    name: "Professional",
    price: "Coming Soon",
    desc: "Analyze denials and accelerate professional-grade workflows",
    audience: "Advocates, agents, and attorneys",
    color: "#c084fc",
    products: [
      "Everything in Pro",
      "Decision Deconstructor",
      "Appeal Strategy Workbench",
      "Attorney Research Mode",
      "Advanced CAVC deep dive",
      "Professional exports and reports",
      "Higher usage limits",
    ],
    cta: "Join Waitlist",
    ctaLink: null,
  },
];

export default function PricingPage() {
  return (
    <Layout activeSection="tools">
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-600)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Claims Intelligence Platform</div>
          <h1 style={{ fontFamily: "'Lora'", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
            Choose Your Research Level
          </h1>
          <p style={{ fontSize: 16, color: "var(--ink-light)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            Free tools for every veteran. Deeper workflows for serious researchers. Professional-grade analysis for advocates and attorneys.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "start" }}>
          {TIERS.map((tier) => (
            <div key={tier.name} style={{
              border: "1px solid var(--cream-border)",
              borderRadius: "var(--radius)",
              padding: "32px 28px",
              background: "var(--white)",
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tier.color,
                }}>{tier.name}</span>
              </div>
              <div style={{ fontFamily: "'Lora'", fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
                {tier.price}
              </div>
              <p style={{ fontSize: 14, color: "var(--ink-light)", marginBottom: 8, lineHeight: 1.5 }}>
                {tier.desc}
              </p>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 20, fontStyle: "italic" }}>
                {tier.audience}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", flex: 1 }}>
                {tier.products.map((p) => (
                  <li key={p} style={{ fontSize: 14, color: "var(--ink)", padding: "6px 0", borderBottom: "1px solid var(--cream-border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: tier.color, fontSize: 14, fontWeight: 700 }}>+</span> {p}
                  </li>
                ))}
              </ul>
              {tier.ctaLink ? (
                <Link to={tier.ctaLink} style={{
                  display: "block",
                  textAlign: "center",
                  padding: "12px 24px",
                  borderRadius: 8,
                  background: tier.color,
                  color: tier.name === "Free" ? "var(--navy-900)" : "white",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  fontFamily: "'Source Sans 3'",
                }}>
                  {tier.cta}
                </Link>
              ) : (
                <button disabled style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 24px",
                  borderRadius: 8,
                  background: "var(--cream-border)",
                  color: "var(--ink-light)",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "none",
                  cursor: "default",
                  fontFamily: "'Source Sans 3'",
                }}>
                  {tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48, padding: "24px", background: "var(--cream-bg)", borderRadius: "var(--radius)" }}>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, maxWidth: 600, margin: "0 auto" }}>
            Grounded in BVA decisions, CFR, KnowVA, and CAVC research. Not legal advice. Not affiliated with the VA.
          </p>
        </div>
      </div>
    </Layout>
  );
}
