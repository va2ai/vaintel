import { Link } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import "./styles/publication.css";

const PAGES = {
  about: {
    eyebrow: "About Veteran 2 Veteran",
    title: "A claims-intelligence publication built for the people doing the work.",
    intro:
      "Veteran 2 Veteran is a VA claims intelligence platform that combines independent reporting, practical research tools, and premium claim-analysis workflows for veterans, advocates, and attorneys.",
    highlight: "Grounded in BVA decisions, CFR, KnowVA, and CAVC research. Not legal advice. Not affiliated with the VA.",
    quote:
      "The goal is not to sound smart about the VA. The goal is to make the system easier to understand, easier to challenge, and harder to misread.",
    blocks: [
      {
        title: "What this site is",
        body: [
          "An editorial publication covering VA policy, appeals, evidence strategy, and decision patterns.",
          "A public research layer with free tools that help veterans and advocates find rules, cases, and examples faster.",
          "A premium workflow layer for deeper analysis, including products like Decision Deconstructor.",
        ],
      },
      {
        title: "What makes it different",
        body: [
          "The trust story is built on domain sources and workflow discipline, not generic chatbot framing.",
          "The platform is being designed as a connected research-to-publication system, so reporting, tools, and editorial review reinforce each other.",
          "The core category is VA claims intelligence: independent reporting plus research and strategy workflows in one product surface.",
        ],
      },
      {
        title: "Who it is for",
        body: [
          "Veterans trying to understand a claim, denial, or next step.",
          "Advocates, VSOs, and agents who need faster issue spotting and evidence research.",
          "Attorneys who want stronger issue-by-issue analysis and a more structured intake-to-research workflow.",
        ],
      },
    ],
    facts: [
      { label: "Category", value: "VA claims intelligence" },
      { label: "Core surfaces", value: "Publication, free tools, premium workflows" },
      { label: "Flagship wedge", value: "Decision Deconstructor" },
    ],
    ctas: [
      { label: "Explore Tools", path: "/tools", tone: "primary" },
      { label: "See Pricing", path: "/pricing", tone: "secondary" },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "Direct contact for editorial, research, and product questions.",
    intro:
      "If you are reporting a bug, asking about a tool, or reaching out about editorial coverage, use the contact paths below. This site does not provide legal representation through this page.",
    highlight: "Questions about a live claim should still be checked against primary VA, CFR, and court sources.",
    quote:
      "The fastest useful message is specific: what page you were on, what tool you were using, and what you expected to happen.",
    blocks: [
      {
        title: "Editorial and product",
        body: [
          "Email: ccdmndkut2@gmail.com",
          "Use this for research feedback, story tips, product issues, partnership questions, and access problems.",
        ],
      },
      {
        title: "What to include",
        body: [
          "The page or tool you were using.",
          "A short description of the problem or request.",
          "Screenshots, copied error text, or the decision/article URL when relevant.",
        ],
      },
      {
        title: "Important boundary",
        body: [
          "This contact page is for publication and product support.",
          "It is not a legal intake form and does not create an attorney-client or representative relationship.",
        ],
      },
    ],
    facts: [
      { label: "Primary inbox", value: "ccdmndkut2@gmail.com" },
      { label: "Best for", value: "Editorial, bugs, access, partnerships" },
      { label: "Not for", value: "Formal legal representation" },
    ],
    ctas: [
      { label: "Open Pricing", path: "/pricing", tone: "primary" },
      { label: "Read About V2", path: "/about", tone: "secondary" },
    ],
  },
  privacy: {
    eyebrow: "Privacy",
    title: "What data this site handles right now.",
    intro:
      "This page is a practical privacy summary for the current product. It explains the main categories of information the site stores and the operational reasons for storing them.",
    highlight: "If the product surface changes materially, this page should be updated before new collection behavior goes live.",
    quote:
      "The operating rule is simple: collect what the workflow needs, store it deliberately, and avoid pretending a research tool is a private legal channel.",
    blocks: [
      {
        title: "Information you may provide",
        body: [
          "Newsletter sign-up email addresses.",
          "Authentication details provided through Firebase Authentication when you sign in.",
          "Content you enter into tools, such as pasted decision text or research prompts.",
        ],
      },
      {
        title: "Operational use",
        body: [
          "Admin, editorial, and workflow records are stored to manage publication, subscriptions, access, and usage limits.",
          "Premium-tool usage may be tracked for entitlement and metering.",
          "Uploaded or generated content may be stored to support the product workflow you initiated.",
        ],
      },
      {
        title: "Current limits",
        body: [
          "This site is not presented as a confidential legal-services portal.",
          "Do not assume anything submitted here is protected by attorney-client privilege.",
          "Do not upload sensitive information unless the product flow clearly requires it and you are comfortable with the storage context.",
        ],
      },
    ],
    facts: [
      { label: "Auth", value: "Firebase Authentication" },
      { label: "Content storage", value: "Firestore and Firebase Storage" },
      { label: "Billing layer", value: "Stripe via Firebase extension workflow" },
    ],
    ctas: [
      { label: "Read Terms", path: "/terms", tone: "primary" },
      { label: "Contact", path: "/contact", tone: "secondary" },
    ],
  },
  terms: {
    eyebrow: "Terms",
    title: "Use the site as a research and publishing platform, not as legal advice.",
    intro:
      "These current-use terms summarize the operational rules for using Veteran 2 Veteran’s publication and tools. They should be treated as a working product policy until a fuller legal terms document replaces them.",
    highlight: "Every public and premium surface should be understood as informational unless a separate professional engagement explicitly says otherwise.",
    quote:
      "The product can accelerate research. It cannot replace source review, professional judgment, or formal representation.",
    blocks: [
      {
        title: "No legal advice",
        body: [
          "The site provides reporting, educational material, and research support.",
          "Using the site or its tools does not create an attorney-client, agent-client, VSO, or fiduciary relationship.",
        ],
      },
      {
        title: "Use of tools",
        body: [
          "You are responsible for reviewing outputs before relying on them.",
          "Generated analysis, suggested citations, and strategy workflows can be wrong, incomplete, or outdated.",
          "You should verify important claims against primary sources and your own records.",
        ],
      },
      {
        title: "Accounts and access",
        body: [
          "Premium access may depend on active subscription status and usage limits.",
          "Access can be limited, suspended, or changed if billing status changes or if the service is abused.",
        ],
      },
    ],
    facts: [
      { label: "Nature of service", value: "Information and research support" },
      { label: "Reliance rule", value: "Verify outputs before use" },
      { label: "Representation", value: "Not created by site use alone" },
    ],
    ctas: [
      { label: "Explore Tools", path: "/tools", tone: "primary" },
      { label: "Contact", path: "/contact", tone: "secondary" },
    ],
  },
};

function CtaLink({ cta }) {
  const className =
    cta.tone === "primary"
      ? "pub-info-page__cta pub-info-page__cta--primary"
      : "pub-info-page__cta pub-info-page__cta--secondary";
  return (
    <Link to={cta.path} className={className}>
      {cta.label}
    </Link>
  );
}

export default function InfoPage({ pageKey = "about" }) {
  const page = PAGES[pageKey] || PAGES.about;

  return (
    <Layout activeSection={null}>
      <section className="pub-info-page">
        <div className="pub-info-page__shell">
          <div className="pub-info-page__hero">
            <div className="pub-info-page__eyebrow">{page.eyebrow}</div>
            <h1 className="pub-info-page__title">{page.title}</h1>
            <p className="pub-info-page__intro">{page.intro}</p>
            <p className="pub-info-page__highlight">{page.highlight}</p>
            <div className="pub-info-page__cta-row">
              {page.ctas.map((cta) => (
                <CtaLink key={cta.label} cta={cta} />
              ))}
            </div>
          </div>

          <aside className="pub-info-page__quote-card">
            <div className="pub-info-page__quote-mark">V2</div>
            <p className="pub-info-page__quote">{page.quote}</p>
          </aside>
        </div>

        <div className="pub-info-page__content">
          <div className="pub-info-page__blocks">
            {page.blocks.map((block) => (
              <section key={block.title} className="pub-info-page__block">
                <h2 className="pub-info-page__block-title">{block.title}</h2>
                <div className="pub-info-page__rule" />
                {block.body.map((paragraph) => (
                  <p key={paragraph} className="pub-info-page__block-body">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <aside className="pub-info-page__facts">
            <div className="pub-info-page__facts-label">At a glance</div>
            {page.facts.map((fact) => (
              <div key={fact.label} className="pub-info-page__fact">
                <div className="pub-info-page__fact-label">{fact.label}</div>
                <div className="pub-info-page__fact-value">{fact.value}</div>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </Layout>
  );
}
