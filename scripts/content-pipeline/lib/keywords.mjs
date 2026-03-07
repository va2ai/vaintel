/**
 * keywords.mjs - Shared keyword taxonomy and relevance scoring for VA content pipeline.
 *
 * Provides categorized keyword lists, CFR/CAVC pattern matching, relevance scoring,
 * and topic classification for VA disability claims content.
 */

// ---------------------------------------------------------------------------
// Keyword taxonomy
// ---------------------------------------------------------------------------

export const KEYWORDS = {
  claims: [
    'disability claim', 'va claim', 'supplemental claim', 'claim for increase',
    'intent to file', 'itf', 'fully developed claim', 'fdc', 'standard claim',
    'original claim', 'new claim', 'reopened claim', 'claim denied',
    'claim approved', 'service connection', 'service-connected',
    'direct service connection', 'secondary service connection',
    'presumptive service connection', 'aggravation', 'in-service event',
    'nexus letter', 'nexus opinion', 'independent medical opinion', 'imo',
    'disability benefits questionnaire', 'dbq', 'buddy statement',
    'lay evidence', 'medical evidence', 'evidence submission',
    'duty to assist', 'benefit of the doubt', 'favorable finding',
  ],

  appeals: [
    'appeal', 'higher-level review', 'hlr', 'supplemental claim',
    'board appeal', 'bva appeal', 'notice of disagreement', 'nod',
    'statement of the case', 'soc', 'supplemental statement of the case',
    'ssoc', 'form 10182', 'form 20-0995', 'form 20-0996',
    'decision review', 'ama', 'appeals modernization act',
    'legacy appeal', 'docket', 'hearing', 'board hearing',
    'video conference hearing', 'travel board', 'remand',
    'grant', 'denial', 'cavc appeal', 'joint motion for remand', 'jmr',
    'court of appeals for veterans claims', 'cavc',
    'federal circuit', 'equal access to justice act', 'eaja',
  ],

  ratings: [
    'disability rating', 'combined rating', 'va math', 'bilateral factor',
    'total disability', '100 percent', '100%', 'tdiu',
    'individual unemployability', 'total disability based on individual unemployability',
    'schedular rating', 'extraschedular', 'rating decision',
    'rating schedule', 'vasrd', 'diagnostic code', 'dc ',
    'proposed reduction', 'rating reduction', 'protected rating',
    'static disability', 'permanent and total', 'p&t',
    'special monthly compensation', 'smc',
    'smc-s', 'smc-t', 'smc-k', 'smc-l', 'smc-r',
    'aid and attendance', 'housebound',
  ],

  conditions: [
    'ptsd', 'post-traumatic stress disorder', 'tbi',
    'traumatic brain injury', 'mst', 'military sexual trauma',
    'gulf war illness', 'burn pit', 'pact act', 'agent orange',
    'camp lejeune', 'radiation exposure', 'tinnitus', 'hearing loss',
    'sleep apnea', 'migraine', 'gerd', 'flatfoot', 'plantar fasciitis',
    'knee condition', 'back condition', 'lumbar strain',
    'cervical strain', 'radiculopathy', 'neuropathy',
    'depression', 'anxiety', 'adjustment disorder',
    'somatic symptom disorder', 'chronic fatigue',
    'fibromyalgia', 'hypertension', 'diabetes', 'ischemic heart disease',
    'erectile dysfunction', 'skin condition', 'scars',
    'presumptive condition', 'toxic exposure',
  ],

  regulations: [
    '38 cfr', '38 usc', '38 c.f.r', '38 u.s.c',
    'title 38', 'code of federal regulations',
    'federal register', 'proposed rule', 'final rule',
    'interim final rule', 'regulatory change',
    'm21-1', 'adjudication procedures manual',
    'va handbook', 'va directive', 'va policy',
    'effective date', 'retroactive', 'liberalizing law',
  ],

  legal: [
    'precedent', 'precedential', 'cavc decision', 'cavc opinion',
    'federal circuit', 'en banc', 'panel decision',
    'memorandum decision', 'single judge decision',
    'gilbert v. derwinski', 'hickson v. west', 'shedden v. principi',
    'mclain v. nicholson', 'horn v. shinseki',
    'johnson v. mcdonough', 'saunders v. wilkie',
    'veteran represented', 'pro se', 'accredited representative',
    'vso', 'veterans service organization', 'va attorney',
    'claims agent', 'power of attorney',
  ],

  benefits: [
    'compensation', 'pension', 'dependency and indemnity compensation', 'dic',
    'survivors benefits', 'education benefits', 'gi bill',
    'vocational rehabilitation', 'vr&e', 'chapter 31',
    'adapted housing', 'automobile grant',
    'clothing allowance', 'dental benefits',
    'caregiver program', 'champva', 'va healthcare',
    'community care', 'veterans choice',
    'burial benefits', 'headstone', 'memorial',
    'back pay', 'retroactive pay', 'effective date',
  ],

  process: [
    'c&p exam', 'compensation and pension', 'va examination',
    'qme', 'ace exam', 'in-person exam', 'telehealth exam',
    'vba', 'veterans benefits administration',
    'regional office', 'varo', 'decision review officer', 'dro',
    'ramp', 'rapid appeals modernization program',
    'claims backlog', 'processing time', 'wait time',
    'ebenefits', 'va.gov', 'accessva',
    'vbms', 'veterans benefits management system',
  ],
};

/**
 * Flat array of all keywords across all categories.
 */
export const ALL_KEYWORDS = Object.values(KEYWORDS).flat();

// ---------------------------------------------------------------------------
// Pattern matchers
// ---------------------------------------------------------------------------

/**
 * Regex patterns for detecting CFR citations (e.g. "38 CFR 3.340", "38 C.F.R. \u00A7 4.16").
 */
export const CFR_PATTERN = /38\s*(?:C\.?F\.?R\.?)\s*(?:\u00A7\s*)?(\d+\.\d+(?:\([a-z]\))?)/gi;

/**
 * Regex patterns for detecting USC citations (e.g. "38 U.S.C. \u00A7 1110").
 */
export const USC_PATTERN = /38\s*(?:U\.?S\.?C\.?)\s*(?:\u00A7\s*)?(\d+[a-zA-Z]?)/gi;

/**
 * Regex for detecting CAVC case citations (e.g. "Smith v. Wilkie", "Jones v. McDonough").
 * Matches "Name v. Name" pattern typical of case law.
 */
export const CAVC_CASE_PATTERN = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+v\.\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g;

/**
 * Common VA Secretary / opposing party names in CAVC cases.
 */
export const VA_SECRETARY_NAMES = [
  'McDonough', 'Wilkie', 'Shulkin', 'McDonald', 'Gibson', 'Shinseki',
  'Peake', 'Nicholson', 'Principi', 'West', 'Brown', 'Derwinski',
];

// ---------------------------------------------------------------------------
// Scoring & classification
// ---------------------------------------------------------------------------

/**
 * Score the relevance of a text string to VA disability claims topics.
 *
 * @param {string} text - The text to score.
 * @param {object} [options] - Optional settings.
 * @param {number} [options.sourceReliability=5] - Reliability score (1-10) of the source.
 * @returns {{ score: number, matchedKeywords: string[], categories: string[], cfrCitations: string[], caseNames: string[] }}
 */
export function scoreRelevance(text, options = {}) {
  const { sourceReliability = 5 } = options;

  if (!text || typeof text !== 'string') {
    return { score: 0, matchedKeywords: [], categories: [], cfrCitations: [], caseNames: [] };
  }

  const lower = text.toLowerCase();
  const matchedKeywords = [];
  const categoryHits = {};

  // Check each category's keywords
  for (const [category, words] of Object.entries(KEYWORDS)) {
    for (const keyword of words) {
      if (lower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        categoryHits[category] = (categoryHits[category] || 0) + 1;
      }
    }
  }

  // Extract CFR citations
  const cfrCitations = [];
  let match;
  const cfrRegex = new RegExp(CFR_PATTERN.source, CFR_PATTERN.flags);
  while ((match = cfrRegex.exec(text)) !== null) {
    cfrCitations.push(`38 CFR ${match[1]}`);
  }

  // Extract CAVC case names
  const caseNames = [];
  const caseRegex = new RegExp(CAVC_CASE_PATTERN.source, CAVC_CASE_PATTERN.flags);
  while ((match = caseRegex.exec(text)) !== null) {
    const fullName = `${match[1]} v. ${match[2]}`;
    // Only include if one party is a known VA Secretary name (reduces false positives)
    if (VA_SECRETARY_NAMES.some(n => match[2].includes(n) || match[1].includes(n))) {
      caseNames.push(fullName);
    }
  }

  // Calculate raw score based on keyword density
  const uniqueKeywords = [...new Set(matchedKeywords)];
  const categoryCount = Object.keys(categoryHits).length;

  // Base score: keyword matches (diminishing returns past 10)
  let rawScore = Math.min(uniqueKeywords.length * 5, 50);

  // Category breadth bonus (topics spanning multiple categories are more relevant)
  rawScore += Math.min(categoryCount * 8, 24);

  // CFR/case citation bonus
  rawScore += Math.min(cfrCitations.length * 5, 15);
  rawScore += Math.min(caseNames.length * 5, 10);

  // Apply source reliability multiplier (0.4 - 1.0)
  const reliabilityMultiplier = 0.4 + (sourceReliability / 10) * 0.6;
  const finalScore = Math.round(Math.min(rawScore * reliabilityMultiplier, 100));

  return {
    score: finalScore,
    matchedKeywords: uniqueKeywords,
    categories: Object.keys(categoryHits),
    cfrCitations: [...new Set(cfrCitations)],
    caseNames: [...new Set(caseNames)],
  };
}

/**
 * Classify a text into one or more topic categories.
 *
 * @param {string} text - The text to classify.
 * @returns {{ primary: string|null, secondary: string[], scores: Record<string, number> }}
 */
export function classifyTopic(text) {
  if (!text || typeof text !== 'string') {
    return { primary: null, secondary: [], scores: {} };
  }

  const lower = text.toLowerCase();
  const scores = {};

  for (const [category, words] of Object.entries(KEYWORDS)) {
    let count = 0;
    for (const keyword of words) {
      if (lower.includes(keyword.toLowerCase())) {
        count++;
      }
    }
    // Normalize by category size so larger categories don't dominate
    scores[category] = words.length > 0 ? (count / words.length) * 100 : 0;
  }

  // Sort categories by score descending
  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a);

  const primary = sorted.length > 0 ? sorted[0][0] : null;
  const secondary = sorted.slice(1).filter(([, s]) => s > 2).map(([c]) => c);

  return { primary, secondary, scores };
}

/**
 * Extract all VA-specific entities from text.
 *
 * @param {string} text - The text to extract entities from.
 * @returns {{ cfrCitations: string[], uscCitations: string[], caseNames: string[], keywords: string[] }}
 */
export function extractEntities(text) {
  if (!text || typeof text !== 'string') {
    return { cfrCitations: [], uscCitations: [], caseNames: [], keywords: [] };
  }

  const cfrCitations = [];
  const uscCitations = [];
  const caseNames = [];

  let match;

  const cfrRegex = new RegExp(CFR_PATTERN.source, CFR_PATTERN.flags);
  while ((match = cfrRegex.exec(text)) !== null) {
    cfrCitations.push(`38 CFR ${match[1]}`);
  }

  const uscRegex = new RegExp(USC_PATTERN.source, USC_PATTERN.flags);
  while ((match = uscRegex.exec(text)) !== null) {
    uscCitations.push(`38 USC ${match[1]}`);
  }

  const caseRegex = new RegExp(CAVC_CASE_PATTERN.source, CAVC_CASE_PATTERN.flags);
  while ((match = caseRegex.exec(text)) !== null) {
    caseNames.push(`${match[1]} v. ${match[2]}`);
  }

  // Find matched keywords
  const lower = text.toLowerCase();
  const keywords = ALL_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));

  return {
    cfrCitations: [...new Set(cfrCitations)],
    uscCitations: [...new Set(uscCitations)],
    caseNames: [...new Set(caseNames)],
    keywords: [...new Set(keywords)],
  };
}

/**
 * Compute keyword-based similarity between two texts (Jaccard on matched keywords).
 *
 * @param {string} textA
 * @param {string} textB
 * @returns {number} Similarity score 0-1.
 */
export function keywordSimilarity(textA, textB) {
  if (!textA || !textB) return 0;

  const lowerA = textA.toLowerCase();
  const lowerB = textB.toLowerCase();

  const setA = new Set(ALL_KEYWORDS.filter(kw => lowerA.includes(kw.toLowerCase())));
  const setB = new Set(ALL_KEYWORDS.filter(kw => lowerB.includes(kw.toLowerCase())));

  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}
