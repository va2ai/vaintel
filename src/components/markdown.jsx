import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ breaks: true, gfm: true });

export const HEADING_ICONS = {
  ":shield:": "\u{1F6E1}\uFE0F", ":search:": "\u{1F50D}", ":lock:": "\u{1F512}", ":alert:": "\u26A0\uFE0F",
  ":check:": "\u2705", ":star:": "\u2B50", ":fire:": "\u{1F525}", ":book:": "\u{1F4D6}",
  ":chart:": "\u{1F4CA}", ":gavel:": "\u2696\uFE0F", ":flag:": "\u{1F6A9}", ":target:": "\u{1F3AF}",
  ":tools:": "\u{1F6E0}\uFE0F", ":money:": "\u{1F4B0}", ":brain:": "\u{1F9E0}", ":link:": "\u{1F517}",
  ":eye:": "\u{1F441}\uFE0F", ":doc:": "\u{1F4C4}", ":bulb:": "\u{1F4A1}", ":medal:": "\u{1F396}\uFE0F",
};

export function replaceHeadingIcons(text) {
  for (const [code, emoji] of Object.entries(HEADING_ICONS)) {
    text = text.replaceAll(code, emoji);
  }
  return text;
}

export function postProcessHTML(html) {
  html = html.replace(
    /<blockquote>\s*<p>\[!(tip|warning|important|check|danger|quote)\]\s*/gi,
    (_, type) => `<div class="callout callout-${type.toLowerCase()}"><p>`
  );
  html = html.replace(/<\/blockquote>/g, (match, offset) => {
    const before = html.substring(Math.max(0, offset - 500), offset);
    return before.includes('class="callout') ? "</div>" : match;
  });
  for (const [code, emoji] of Object.entries(HEADING_ICONS)) {
    html = html.replaceAll(code, `<span class="heading-icon">${emoji}</span>`);
  }
  return html;
}

export function renderMarkdown(text) {
  return DOMPurify.sanitize(postProcessHTML(marked.parse(text || '')));
}

export const MONTHS = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

export function toISODate(dateStr) {
  if (!dateStr) return "";
  const m = dateStr.match(/^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${MONTHS[m[1]] || "01"}-${m[2].padStart(2, "0")}`;
}

export const TimeTag = ({ date, style }) => {
  const iso = toISODate(date);
  return <time dateTime={iso} style={style}>{date}</time>;
};

// ArticleSchemaScript injects JSON-LD structured data for articles.
// All inputs are sanitized via DOMPurify (strip all tags) before injection.
export function ArticleSchemaScript({ article }) {
  if (!article) return null;
  const sanitize = (s) => DOMPurify.sanitize(s, { ALLOWED_TAGS: [] });
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": sanitize(article.title),
    "description": sanitize(article.excerpt),
    "datePublished": toISODate(article.date),
    "author": { "@type": "Person", "name": sanitize(article.author || "Chris Combs") },
    "publisher": { "@type": "Organization", "name": "Veteran 2 Veteran LLC" },
    "mainEntityOfPage": "https://veteran2veteran.com/#analysis",
  };
  const safeJSON = DOMPurify.sanitize(JSON.stringify(schema), { ALLOWED_TAGS: [] });
  // Safe: all values are DOMPurify-sanitized with no allowed tags before serialization
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJSON }} />;
}
