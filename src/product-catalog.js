export const TIERS = [
  {
    slug: "free",
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
    slug: "pro",
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
    ctaLink: "/pricing",
  },
  {
    slug: "professional",
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
    ctaLink: "/pricing",
  },
];

export const TOOL_CATALOG = [
  {
    slug: "bva-search",
    name: "BVA Decision Search",
    desc: "Search thousands of Board decisions by keyword, issue, or outcome.",
    status: "Live",
    tier: "free",
    route: "/bva",
    listSurface: "public",
  },
  {
    slug: "cavc-library",
    name: "CAVC Precedent Library",
    desc: "Detailed breakdowns of Court decisions, holdings, reasoning, and practical impact.",
    status: "Live",
    tier: "free",
    route: "/guide/cavc-precedent-library",
    listSurface: "public",
  },
  {
    slug: "cfr-navigator",
    name: "38 CFR Navigator",
    desc: "Ask plain-language questions and jump to the regulation sections that control the claim.",
    status: "Live",
    tier: "free",
    route: "/tools",
    listSurface: "public",
  },
  {
    slug: "knowva-search",
    name: "KnowVA / M21-1 Search",
    desc: "Search VA adjudication guidance to see how raters evaluate a condition or issue.",
    status: "Live",
    tier: "free",
    route: "/tools",
    listSurface: "public",
  },
  {
    slug: "va-math-calculator",
    name: "VA Math Calculator",
    desc: "Estimate your combined VA disability rating using the actual bilateral factor formula.",
    status: "Live",
    tier: "free",
    route: "/guide/va-math",
    listSurface: "public",
  },
  {
    slug: "nexus-scout-lite",
    name: "Nexus Scout Lite",
    desc: "Discover potential secondary claims backed by BVA case evidence.",
    status: "Live",
    tier: "free",
    route: "/nexus-scout",
    listSurface: "public",
  },
  {
    slug: "claim-research-assistant",
    name: "Claim Research Assistant",
    desc: "Cross-source claim research grounded in BVA decisions, CAVC precedent, and CFR.",
    status: "Beta",
    tier: "pro",
    route: "/tools",
    listSurface: "premium",
  },
  {
    slug: "nexus-scout-pro",
    name: "Nexus Scout Pro",
    desc: "Expanded secondary-claim research with stronger evidence mapping and claim-building suggestions.",
    status: "Coming",
    tier: "pro",
    route: "/pricing",
    listSurface: "premium",
  },
  {
    slug: "cavc-case-analyzer",
    name: "CAVC Case Analyzer",
    desc: "Structured case breakdowns with holdings, reasoning, and claims-strategy implications.",
    status: "Coming",
    tier: "pro",
    route: "/pricing",
    listSurface: "premium",
  },
  {
    slug: "decision-deconstructor",
    name: "Decision Deconstructor",
    desc: "Upload a VA decision for favorable findings extraction, denial basis mapping, and next-step strategy.",
    status: "Live",
    tier: "professional",
    route: "/decision-deconstructor",
    listSurface: "premium",
    meter: {
      monthlyLimitByTier: {
        free: 1,
        pro: 2,
        professional: 25,
      },
      label: "analyses / month",
    },
  },
  {
    slug: "appeal-strategy-workbench",
    name: "Appeal Strategy Workbench",
    desc: "Issue mapping, appeal-oriented research, evidence gap review, and structured next-step strategy.",
    status: "Coming",
    tier: "professional",
    route: "/pricing",
    listSurface: "premium",
  },
];

const TIER_ORDER = ["free", "pro", "professional"];

export function getTier(slug) {
  return TIERS.find((tier) => tier.slug === slug) || TIERS[0];
}

export function getTierRank(slug) {
  return Math.max(TIER_ORDER.indexOf(slug || "free"), 0);
}

export function getTool(slug) {
  return TOOL_CATALOG.find((tool) => tool.slug === slug) || null;
}

export function isEntitledToTool(toolSlug, planSlug = "free") {
  const tool = getTool(toolSlug);
  if (!tool) return false;
  return getTierRank(planSlug) >= getTierRank(tool.tier);
}

export function getMonthlyLimit(toolSlug, planSlug = "free") {
  const tool = getTool(toolSlug);
  if (!tool?.meter?.monthlyLimitByTier) return null;
  return tool.meter.monthlyLimitByTier[planSlug] ?? null;
}

export function getUsageState(toolSlug, planSlug = "free", used = 0) {
  const tool = getTool(toolSlug);
  const limit = getMonthlyLimit(toolSlug, planSlug);
  const entitled = isEntitledToTool(toolSlug, planSlug);
  const remaining = limit == null ? null : Math.max(limit - used, 0);
  const canRun = (entitled || limit != null) && (remaining == null || remaining > 0);

  return {
    tool,
    entitled,
    used,
    limit,
    remaining,
    canRun,
  };
}
