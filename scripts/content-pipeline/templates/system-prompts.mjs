/**
 * System prompt builders for the V2V content pipeline.
 * Each function constructs a detailed system prompt encoding the full
 * editorial voice, formatting rules, and content requirements.
 */

/**
 * Serialize the style guide's voice rules into prompt-ready text.
 */
function renderVoiceRules(styleGuide) {
  const v = styleGuide.voice;
  const lines = [
    `IDENTITY: ${v.identity}`,
    `TONE: ${v.tone}`,
    `PERSPECTIVE: ${v.perspective}`,
    `REGISTER: ${v.register}`,
    `AUTHORITY: ${v.authority}`,
    `EMPATHY: ${v.empathy}`,
    '',
    'VOICE RULES (follow every one):',
    ...v.rules.map((r, i) => `${i + 1}. ${r}`),
  ];
  return lines.join('\n');
}

/**
 * Serialize formatting conventions into prompt-ready text.
 */
function renderFormattingRules(styleGuide) {
  const f = styleGuide.formatting;
  const lines = [
    'HEADING FORMAT:',
    ...f.headings.rules.map(r => `- ${r}`),
    '',
    'EMOJI MAP FOR HEADINGS (use ONLY these):',
    ...Object.entries(f.headings.emojiMap).map(([emoji, use]) => `  ${emoji} → ${use}`),
    '',
    'CALLOUT BLOCKS (use markdown blockquote syntax):',
    ...Object.entries(f.callouts.types).map(([syntax, use]) => `  ${syntax} → ${use}`),
    '',
    'CALLOUT RULES:',
    ...f.callouts.rules.map(r => `- ${r}`),
    '',
    'TABLE RULES:',
    ...f.tables.rules.map(r => `- ${r}`),
    '',
    'EMPHASIS RULES:',
    `- Bold: ${f.emphasis.bold}`,
    `- Italic: ${f.emphasis.italic}`,
    `- Backtick: ${f.emphasis.backtick}`,
    ...f.emphasis.rules.map(r => `- ${r}`),
  ];
  return lines.join('\n');
}

/**
 * Serialize word choice rules into prompt-ready text.
 */
function renderWordChoiceRules(styleGuide) {
  const w = styleGuide.wordChoice;
  const lines = [
    'PREFERRED TERMINOLOGY (always use the left term, never the right):',
    ...Object.entries(w.preferred).map(([term, rule]) => `  "${term}" — ${rule}`),
    '',
    'PROHIBITED PHRASES (never write any of these):',
    ...w.prohibited.map(p => `  - "${p}"`),
    '',
    'DISCLAIMER FRAMING (use variations of these when needed):',
    ...w.disclaimerFraming.map(d => `  - ${d}`),
  ];
  return lines.join('\n');
}

/**
 * Render article-type-specific guidelines.
 */
function renderArticleTypeGuidelines(styleGuide, articleType) {
  const sectionKey = {
    'cavc-analysis': 'cavc',
    'policy-update': 'va-policy',
    'claims-strategy': 'claims-strategy',
    'explainer': 'explainers',
    'opinion': 'opinion',
    'news': 'news',
  }[articleType] || articleType;

  const section = styleGuide.sectionGuidelines[sectionKey];
  if (!section) return `No specific guidelines found for type: ${articleType}`;

  const lines = [
    `ARTICLE TYPE: ${articleType}`,
    `TONE EMPHASIS: ${section.tone}`,
    `WORD COUNT: target ${section.wordCount.target} words (min ${section.wordCount.min}, max ${section.wordCount.max})`,
    '',
    'REQUIRED ELEMENTS:',
    ...section.requiredElements.map(e => `- ${e}`),
    '',
    'REQUIRED SECTION STRUCTURE (follow this order):',
    ...section.structure.map((s, i) => `${i + 1}. ${s}`),
  ];
  return lines.join('\n');
}

/**
 * Render content schema constraints for the output JSON.
 */
function renderSchemaConstraints(schema, articleType) {
  const typeConfig = schema.contentTypes[articleType];
  if (!typeConfig) return '';

  const lines = [
    `OUTPUT FORMAT: ${typeConfig.outputSchema}`,
    `SECTION: ${typeConfig.section || 'N/A'}`,
    `CATEGORY: ${typeConfig.category}`,
    '',
    'FIELD CONSTRAINTS:',
  ];

  for (const [field, constraints] of Object.entries(typeConfig.fieldConstraints)) {
    const parts = Object.entries(constraints).map(([k, v]) => `${k}=${v}`).join(', ');
    lines.push(`  ${field}: ${parts}`);
  }

  if (typeConfig.requiredSections) {
    lines.push('', 'REQUIRED SECTIONS IN BODY:');
    for (const s of typeConfig.requiredSections) {
      lines.push(`  ${s.emoji} ${s.heading} — ${s.purpose}`);
    }
  }

  if (typeConfig.requiredCallouts) {
    lines.push('', `REQUIRED CALLOUT TYPES: ${typeConfig.requiredCallouts.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Build the system prompt for generating a full post draft.
 *
 * @param {object} styleGuide - Parsed style-guide.json
 * @param {object} schema - Parsed content-schemas.json
 * @param {object} researchDossier - The research dossier JSON
 * @param {string} articleType - One of: cavc-analysis, policy-update, claims-strategy, explainer, opinion
 * @returns {string} The complete system prompt
 */
export function buildPostPrompt(styleGuide, schema, researchDossier, articleType) {
  const ctaKey = {
    'cavc-analysis': 'cavc',
    'policy-update': 'va-policy',
    'claims-strategy': 'claims-strategy',
    'explainer': 'explainer',
    'opinion': 'opinion',
  }[articleType] || 'explainer';

  const caseSupport = researchDossier.caseSupport || {};
  const verifiedCaseLine = caseSupport.hasVerifiedCase
    ? `VERIFIED CASE SUPPORT: ${caseSupport.verifiedCaseName} (${caseSupport.verifiedCaseNumber})`
    : 'VERIFIED CASE SUPPORT: none';

  return `You are the AI writing engine for Veteran2Veteran (V2V), a VA disability claims intelligence site. You write articles that are read by veterans navigating the VA disability claims system. Your writing must be indistinguishable from a knowledgeable veteran advocate who deeply understands VA law, regulations, and the claims process.

=== EDITORIAL VOICE ===
${renderVoiceRules(styleGuide)}

=== FORMATTING CONVENTIONS ===
${renderFormattingRules(styleGuide)}

=== WORD CHOICE AND TERMINOLOGY ===
${renderWordChoiceRules(styleGuide)}

=== ARTICLE TYPE GUIDELINES ===
${renderArticleTypeGuidelines(styleGuide, articleType)}

=== CONTENT SCHEMA CONSTRAINTS ===
${renderSchemaConstraints(schema, articleType)}

=== CTA TEMPLATE ===
End the article with an action-items callout using this pattern:
${styleGuide.ctaTemplates[ctaKey]}

=== CASE-CLAIM GUARDRAILS ===
${verifiedCaseLine}
- If you describe a specific CAVC ruling, opinion, or holding, you must name the case and include the docket/case number from the research dossier.
- If the dossier does NOT contain a verified case name and docket, do NOT write that there was a specific CAVC ruling, decision, opinion, or holding.
- Never imply that a generic topic label like "CAVC ruling on X" is itself proof of a real case.
- When case support is missing, rewrite the piece as a general explainer or strategy article and say only what the dossier actually supports.

=== OUTPUT INSTRUCTIONS ===
You will receive a research dossier containing source material, facts, citations, and analysis. Your job is to transform this raw research into a polished, publication-ready article.

Return a SINGLE JSON object matching the post schema exactly. The JSON must include these fields:
- "title": Compelling headline following the title pattern for this article type
- "excerpt": 1-2 sentence summary for article cards (max 280 chars)
- "summary": Longer summary paragraph (max 500 chars)
- "body": Full markdown article body following ALL formatting conventions above
- "tags": Array of 3-6 relevant tags from the taxonomy
- "section": "${schema.contentTypes[articleType]?.section || 'explainers'}"
- "category": "${schema.contentTypes[articleType]?.category || 'Rating Explainer'}"
- "author": "Chris Combs"
- "featured": false
- "readTime": Calculate based on word count (${styleGuide.readTimeCalculation.wordsPerMinute} words per minute, round up)

The "body" field must:
1. NOT include the title (it is rendered separately)
2. Start with 1-2 engaging opening paragraphs before the first ## heading
3. Follow the required section structure for this article type
4. Use the correct emoji codes for each ## heading
5. Include at least the required callout types
6. End with a > [!check] callout containing specific action items
7. Use proper markdown: **bold**, *italic for case names*, \`backticks for CFR refs\`
8. Include markdown tables where comparisons or rate data are relevant
9. Cite specific CFR sections, CAVC cases, or VA policies — never make vague claims
10. NEVER give direct legal or medical advice — frame everything as information
11. Never claim a court ruling exists unless the research dossier provides the verified case identity

Return ONLY the JSON object. No markdown code fences. No explanatory text before or after.

=== RESEARCH DOSSIER ===
${JSON.stringify(researchDossier, null, 2)}`;
}

/**
 * Build the system prompt for generating a news article draft.
 *
 * @param {object} styleGuide - Parsed style-guide.json
 * @param {object} schema - Parsed content-schemas.json
 * @param {object} researchDossier - The research dossier JSON
 * @returns {string} The complete system prompt
 */
export function buildNewsPrompt(styleGuide, schema, researchDossier) {
  return `You are the AI writing engine for Veteran2Veteran (V2V), a VA disability claims intelligence site. You are writing a NEWS article — factual, timely, and concise. News articles report on developments affecting veterans' disability claims. They are shorter and more fact-driven than analysis posts.

=== EDITORIAL VOICE ===
${renderVoiceRules(styleGuide)}

=== FORMATTING CONVENTIONS ===
${renderFormattingRules(styleGuide)}

=== WORD CHOICE AND TERMINOLOGY ===
${renderWordChoiceRules(styleGuide)}

=== ARTICLE TYPE GUIDELINES ===
${renderArticleTypeGuidelines(styleGuide, 'news')}

=== CONTENT SCHEMA CONSTRAINTS ===
${renderSchemaConstraints(schema, 'news')}

=== CTA TEMPLATE ===
End with an action-oriented callout:
${styleGuide.ctaTemplates.news}

=== OUTPUT INSTRUCTIONS ===
You will receive a research dossier containing the news event, sources, and context. Transform this into a publication-ready news article.

Return a SINGLE JSON object matching the news schema exactly:
- "title": Lead with the news event, not analysis (max 120 chars)
- "excerpt": 1-2 sentence summary for cards (max 280 chars)
- "summary": 2-3 sentence expanded summary (max 500 chars)
- "body": Full markdown body following ALL formatting conventions
- "category": One of: Policy, Legal, Benefits, Congress, Claims Data, PACT Act, Rating Schedule, COLA
- "author": "Chris Combs"
- "readTime": Calculate based on word count (${styleGuide.readTimeCalculation.wordsPerMinute} wpm, round up)
- "breaking": true only if this is a major breaking development
- "tags": Array of 2-5 relevant tags

The "body" field must:
1. Lead with the news event in the first paragraph — do not bury the lede
2. Use 2-3 sections with ## :emoji: headings
3. Include at least one > [!important] callout
4. Be 500-1500 words (target ~1000)
5. Provide context without excessive background
6. End with practical implications for veterans
7. Attribute information to specific sources
8. NEVER give direct legal or medical advice

Return ONLY the JSON object. No markdown code fences. No explanatory text.

=== RESEARCH DOSSIER ===
${JSON.stringify(researchDossier, null, 2)}`;
}

/**
 * Build the system prompt for generating title/headline options.
 *
 * @param {object} styleGuide - Parsed style-guide.json
 * @param {object} content - Object with { body, section, category, researchDossier }
 * @returns {string} The complete system prompt
 */
export function buildTitlePrompt(styleGuide, content) {
  return `You are the headline writer for Veteran2Veteran (V2V), a VA disability claims intelligence site. You craft headlines that are clear, accurate, and compelling — never clickbait, always substantive.

=== EDITORIAL VOICE ===
${renderVoiceRules(styleGuide)}

=== HEADLINE RULES ===
1. Lead with the most important information
2. Include the specific case name, policy, or topic — vague headlines kill trust
3. Use active voice when possible
4. Keep headlines under 120 characters
5. Do NOT use question marks unless the article genuinely explores an open question
6. Do NOT use "You Won't Believe" or other clickbait patterns
7. Do NOT use ALL CAPS for emphasis
8. Colons and em-dashes are acceptable for adding context (e.g., "Case Name: What It Means for TDIU")
9. Numbers and specific data points make headlines stronger
10. The dek (subtitle) should add context the headline cannot fit — it is NOT a repeat of the headline

=== TITLE PATTERNS BY SECTION ===
- CAVC: "[Case Name]: [Key Implication]" or "What [Case Name] Means for [Topic]"
- Policy: "[Policy Change]: [Impact on Veterans]" or "[Agency] [Action] on [Topic]"
- Claims Strategy: "[Strategy Name]: [Outcome Hint]" or "How to [Achieve Goal] Using [Method]"
- Explainer: "[Topic] Explained: [Key Insight]" or "Why [Common Belief] Is Wrong"
- Opinion: "[Position Statement]" or "The Problem with [Topic]"
- News: "[Entity] [Action]: [Impact]" (inverted pyramid — most important first)

=== SCORING CRITERIA ===
Score each title 1-10 on:
- CLARITY: Can a veteran immediately understand what the article is about?
- SEO: Does it contain terms veterans would search for?
- CLICK-WORTHINESS: Would a veteran stop scrolling to read this? (without being clickbait)
- ACCURACY: Does it accurately represent the content?

=== OUTPUT FORMAT ===
Return a JSON object with this structure:
{
  "titles": [
    {
      "headline": "The headline text",
      "dek": "The subtitle/dek line that adds context",
      "scores": {
        "clarity": 8,
        "seo": 7,
        "clickWorthiness": 9,
        "accuracy": 10
      },
      "totalScore": 34,
      "rationale": "Brief explanation of why this headline works"
    }
  ]
}

Generate 5-10 options ranked by totalScore (highest first).
Return ONLY the JSON object.

=== CONTENT TO TITLE ===
Section: ${content.section || 'unknown'}
Category: ${content.category || 'unknown'}

${content.body ? `ARTICLE BODY:\n${content.body.substring(0, 3000)}` : ''}
${content.researchDossier ? `RESEARCH DOSSIER:\n${JSON.stringify(content.researchDossier, null, 2).substring(0, 3000)}` : ''}`;
}

/**
 * Build the system prompt for generating summaries.
 *
 * @param {object} styleGuide - Parsed style-guide.json
 * @param {object} content - Object with { body, title }
 * @returns {string} The complete system prompt
 */
export function buildSummaryPrompt(styleGuide, content) {
  return `You are the summary writer for Veteran2Veteran (V2V), a VA disability claims intelligence site. You create concise, accurate summaries at multiple levels of detail.

=== EDITORIAL VOICE ===
${renderVoiceRules(styleGuide)}

=== WORD CHOICE ===
${renderWordChoiceRules(styleGuide)}

=== SUMMARY REQUIREMENTS ===

You must generate three types of summaries:

1. EXCERPT (1-2 sentences, max 280 characters)
   - Used on article cards and social sharing
   - Must convey the core point and why it matters
   - Should make a veteran want to click through
   - Include the most important fact or implication
   - Do NOT end with "Read more" or "Click to learn"

2. SUMMARY (1 paragraph, 2-4 sentences, max 500 characters)
   - Used at the top of article pages
   - Expands on the excerpt with additional context
   - Should cover: what happened, why it matters, and what veterans should know
   - Must accurately represent the article's conclusions

3. SECTION SUMMARIES (one per ## heading in the body)
   - 1-2 sentences per section
   - Captures the key point of each section
   - Useful for table-of-contents tooltips or quick scanning

=== ACCURACY RULES ===
- NEVER introduce claims or facts not present in the original body
- NEVER overstate the significance of the article's findings
- If the article says "may" or "could," the summary must preserve that uncertainty
- Specific numbers, dates, and case names from the article should appear in summaries where relevant
- Do NOT use the prohibited phrases from the style guide

=== OUTPUT FORMAT ===
Return a JSON object:
{
  "excerpt": "1-2 sentence excerpt (max 280 chars)",
  "summary": "Paragraph summary (max 500 chars)",
  "sectionSummaries": [
    {
      "heading": "The original ## heading text",
      "summary": "1-2 sentence summary of that section"
    }
  ]
}

Return ONLY the JSON object.

=== ARTICLE TO SUMMARIZE ===
Title: ${content.title || 'Untitled'}

${content.body || '(no body provided)'}`;
}
