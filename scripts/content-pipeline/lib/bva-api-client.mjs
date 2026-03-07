/**
 * BVA API Client
 *
 * Shared client for the V2V BVA Decision Search API and CAVC eFiling endpoints.
 * Used by source-monitor, research-compiler, and citation-checker agents.
 *
 * API base URL: https://bva-api-301313738047.us-central1.run.app
 */

const BVA_API_BASE = process.env.BVA_API_URL || 'https://bva-api-301313738047.us-central1.run.app';
const REQUEST_TIMEOUT = 30_000;

async function apiFetch(path, options = {}) {
  const url = `${BVA_API_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    if (!resp.ok) {
      throw new Error(`BVA API ${resp.status}: ${resp.statusText} (${path})`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── BVA Decision Endpoints ───────────────────────────────────────────────

/**
 * Search BVA decisions by keyword and optional year.
 * @param {string} query - Search keywords
 * @param {object} opts - { year, maxPages, pageSize }
 * @returns {{ query, total_results, results: Array<{url, title, snippet, year, case_number}> }}
 */
export async function searchDecisions(query, opts = {}) {
  return apiFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      year: opts.year || null,
      max_pages: opts.maxPages || 2,
      page_size: opts.pageSize || 20,
    }),
  });
}

/**
 * Get detailed case information (outcome, judge, issues, citations).
 * @param {string} caseUrl - Full URL to the BVA decision
 * @param {boolean} fullText - Include full text (default false)
 */
export async function getCase(caseUrl, fullText = false) {
  const params = new URLSearchParams({ url: caseUrl, full_text: String(fullText) });
  return apiFetch(`/case?${params}`);
}

/**
 * Get raw text of a BVA decision.
 * @param {string} caseUrl - Full URL to the decision
 */
export async function getCaseText(caseUrl) {
  const params = new URLSearchParams({ url: caseUrl });
  const url = `${BVA_API_BASE}/case/text?${params}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`BVA API ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Regex search within a BVA case text using presets or custom pattern.
 * @param {string} caseUrl - Case URL
 * @param {object} opts - { preset, q, section, maxMatches, contextMode }
 */
export async function searchCaseText(caseUrl, opts = {}) {
  return apiFetch('/case/search', {
    method: 'POST',
    body: JSON.stringify({
      url: caseUrl,
      preset: opts.preset || undefined,
      q: opts.q || undefined,
      section: opts.section || undefined,
      max_matches: opts.maxMatches || 50,
      context_mode: opts.contextMode || 'chars',
    }),
  });
}

/**
 * Get available regex search presets.
 */
export async function getSearchPresets() {
  return apiFetch('/case/search/presets');
}

/**
 * Batch search multiple queries.
 * @param {string[]} queries
 * @param {object} opts - { year, maxPages }
 */
export async function batchSearch(queries, opts = {}) {
  return apiFetch('/batch/search', {
    method: 'POST',
    body: JSON.stringify({
      queries,
      year: opts.year || null,
      max_pages: opts.maxPages || 1,
    }),
  });
}

/**
 * Analyze a decision text for keywords and VA terms.
 * @param {string} caseUrl
 * @param {object} opts - { keywords, context }
 */
export async function analyzeText(caseUrl, opts = {}) {
  const params = new URLSearchParams({ url: caseUrl });
  if (opts.keywords) {
    for (const kw of opts.keywords) params.append('keywords', kw);
  }
  if (opts.context) params.set('context', 'true');
  return apiFetch(`/analyze/text?${params}`);
}

// ── CAVC eFiling Endpoints ───────────────────────────────────────────────

/**
 * Search CAVC cases by case number or party name.
 * @param {object} opts - { caseNumber, partyName, openClosed }
 */
export async function cavcSearch(opts = {}) {
  const params = new URLSearchParams();
  if (opts.caseNumber) params.set('case_number', opts.caseNumber);
  if (opts.partyName) params.set('party_name', opts.partyName);
  if (opts.openClosed) params.set('open_closed', opts.openClosed);
  return apiFetch(`/cavc/search?${params}`);
}

/**
 * Get CAVC case summary with parties and counsel.
 * @param {string} caseNumber - e.g. "23-5171"
 */
export async function cavcCaseSummary(caseNumber) {
  return apiFetch(`/cavc/case/${encodeURIComponent(caseNumber)}`);
}

/**
 * Get full CAVC docket report with all entries.
 * @param {string} caseNumber
 */
export async function cavcDocket(caseNumber) {
  return apiFetch(`/cavc/case/${encodeURIComponent(caseNumber)}/docket`);
}

/**
 * Find first docket entry matching a keyword.
 * @param {string} caseNumber
 * @param {string} keyword
 */
export async function cavcFindEntry(caseNumber, keyword) {
  const params = new URLSearchParams({ keyword });
  return apiFetch(`/cavc/case/${encodeURIComponent(caseNumber)}/find?${params}`);
}

/**
 * Check API health.
 */
export async function healthCheck() {
  return apiFetch('/health');
}

// ── Convenience / Pipeline-specific helpers ──────────────────────────────

/**
 * Search BVA decisions for a topic and return structured results
 * suitable for the research pipeline.
 */
export async function researchTopic(topic, opts = {}) {
  const year = opts.year || new Date().getFullYear();
  const results = await searchDecisions(topic, { year, maxPages: opts.maxPages || 2 });

  if (!results.results?.length) return { topic, cases: [], summary: 'No BVA decisions found.' };

  // Get details for top cases (limit to 5 to avoid rate limits)
  const topCases = results.results.slice(0, opts.maxCases || 5);
  const caseDetails = [];

  for (const result of topCases) {
    try {
      const detail = await getCase(result.url);
      caseDetails.push({
        caseNumber: detail.case_number,
        url: result.url,
        outcome: detail.outcome,
        judge: detail.judge,
        issues: detail.issues,
        citations: detail.citations,
        decisionDate: detail.decision_date,
        regionalOffice: detail.regional_office,
        snippet: result.snippet,
      });
    } catch {
      // Skip cases that fail to load
      caseDetails.push({
        caseNumber: result.case_number,
        url: result.url,
        snippet: result.snippet,
        outcome: null,
        error: 'Failed to load case details',
      });
    }
  }

  // Aggregate stats
  const outcomes = caseDetails.filter(c => c.outcome).map(c => c.outcome);
  const grantCount = outcomes.filter(o => o === 'Granted' || o === 'Mixed').length;
  const denyCount = outcomes.filter(o => o === 'Denied').length;
  const remandCount = outcomes.filter(o => o === 'Remanded').length;

  return {
    topic,
    totalResults: results.total_results,
    year,
    cases: caseDetails,
    outcomeBreakdown: {
      granted: grantCount,
      denied: denyCount,
      remanded: remandCount,
      total: outcomes.length,
    },
    allCitations: [...new Set(caseDetails.flatMap(c => c.citations || []))],
    allIssues: [...new Set(caseDetails.flatMap(c => c.issues || []))],
  };
}

/**
 * Verify a CAVC case citation against the live eFiling system.
 * @param {string} partyName - e.g. "Euzebio" or "Caluza"
 * @returns {object|null} Case data if found
 */
export async function verifyCAVCCase(partyName) {
  try {
    const results = await cavcSearch({ partyName });
    const matches = Array.isArray(results) ? results : results?.results;
    if (matches?.length > 0) {
      return matches[0];
    }
    return null;
  } catch {
    return null;
  }
}

export { BVA_API_BASE };
